package handlers

import (
	"orgnote/app/models"
	"sync"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

const (
	WebSocketPrefix = "/ws"
	SocketIDHeader  = "X-Socket-ID"
)

type ThreadSafeConn struct {
	*websocket.Conn
	mu sync.Mutex
	ID string
}

func (c *ThreadSafeConn) WriteJSON(v interface{}) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.Conn.WriteJSON(v)
}

func (c *ThreadSafeConn) WriteMessage(messageType int, data []byte) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.Conn.WriteMessage(messageType, data)
}

type WebSocketHandler struct {
	mu      sync.RWMutex
	clients map[string][]*ThreadSafeConn
}

func NewWebSocketHandler() *WebSocketHandler {
	return &WebSocketHandler{
		clients: make(map[string][]*ThreadSafeConn),
	}
}

// Handle godoc
// @Summary      WebSocket Events Channel
// @Description  Generic WebSocket endpoint for real-time user events (sync, notifications, etc). Requires `Upgrade: websocket` header.
// @Tags         events
// @Param        token query string false "Auth token (alternative to Authorization header)"
// @Success      101  {string}  string  "Switching Protocols"
// @Failure      401  {object}  handlers.HttpError[any]
// @Failure      426  {object}  handlers.HttpError[any]
// @Router       /ws/events [get]
func (h *WebSocketHandler) Handle(c *websocket.Conn) {
	user, ok := h.getUser(c)
	if !ok {
		_ = c.Close()
		return
	}

	socketID := c.Query("socket_id")
	if socketID == "" {
		socketID = uuid.NewString()
	}

	safeConn := &ThreadSafeConn{Conn: c, ID: socketID}
	h.register(user.ID.Hex(), safeConn)
	defer func() {
		h.unregister(user.ID.Hex(), safeConn)
		h.closeConnection(safeConn)
	}()

	log.Info().Str("user_id", user.ID.Hex()).Msg("websocket connection established")
	h.handleConnectionLoop(safeConn, user)
}

func (h *WebSocketHandler) register(userID string, c *ThreadSafeConn) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, ok := h.clients[userID]; !ok {
		h.clients[userID] = make([]*ThreadSafeConn, 0)
	}
	h.clients[userID] = append(h.clients[userID], c)
}

func (h *WebSocketHandler) unregister(userID string, c *ThreadSafeConn) {
	h.mu.Lock()
	defer h.mu.Unlock()

	conns, ok := h.clients[userID]
	if !ok {
		return
	}

	for i, conn := range conns {
		if conn == c {
			h.clients[userID] = append(conns[:i], conns[i+1:]...)
			break
		}
	}

	if len(h.clients[userID]) == 0 {
		delete(h.clients, userID)
	}
}

type WebSocketEvent struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload,omitempty"`
}

func (h *WebSocketHandler) Emit(userID string, eventType string, payload interface{}, excludeSocketID string) {
	h.mu.RLock()
	sourceConns, ok := h.clients[userID]
	if !ok {
		h.mu.RUnlock()
		return
	}
	conns := make([]*ThreadSafeConn, len(sourceConns))
	copy(conns, sourceConns)
	h.mu.RUnlock()

	event := WebSocketEvent{
		Type:    eventType,
		Payload: payload,
	}

	for _, c := range conns {
		if c.ID == excludeSocketID {
			continue
		}
		if err := c.WriteJSON(event); err != nil {
			log.Error().Err(err).Msg("websocket write error during emit")
		}
	}
}

func (h *WebSocketHandler) Middleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	}
}

func (h *WebSocketHandler) getUser(c *websocket.Conn) (*models.User, bool) {
	user, ok := c.Locals("user").(*models.User)
	if !ok {
		log.Error().Msg("websocket: no user found in locals")
		return nil, false
	}
	return user, true
}

func (h *WebSocketHandler) closeConnection(c *ThreadSafeConn) {
	if err := c.Close(); err != nil {
		log.Error().Err(err).Msg("failed to close websocket connection")
	}
}

func (h *WebSocketHandler) handleConnectionLoop(c *ThreadSafeConn, user *models.User) {
	for {
		_, _, err := c.ReadMessage()
		if err == nil {
			continue
		}

		if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
			log.Error().Err(err).Msg("websocket read error")
		}
		break
	}
}

func RegisterWebSocketHandler(app fiber.Router, authMiddleware fiber.Handler, wsHandler *WebSocketHandler) {
	app.Use(WebSocketPrefix, wsHandler.Middleware(), authMiddleware)
	app.Get(WebSocketPrefix+"/events", websocket.New(wsHandler.Handle))
}
