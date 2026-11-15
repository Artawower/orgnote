package services

type EventSender interface {
	Emit(userID string, eventType string, payload interface{}, excludeSocketID string)
}

type NotificationService struct {
	sender     EventSender
	notifyChan chan notificationEvent
}

type notificationEvent struct {
	userID          string
	excludeSocketID string
}

func NewNotificationService(sender EventSender) *NotificationService {
	service := &NotificationService{
		sender:     sender,
		notifyChan: make(chan notificationEvent, 100), // Buffered channel
	}
	go service.processNotifications()
	return service
}

func (s *NotificationService) processNotifications() {
	for event := range s.notifyChan {
		s.sender.Emit(event.userID, "sync", nil, event.excludeSocketID)
	}
}

func (s *NotificationService) NotifySync(userID string, excludeSocketID string) {
	select {
	case s.notifyChan <- notificationEvent{userID: userID, excludeSocketID: excludeSocketID}:
	default:
	}
}
