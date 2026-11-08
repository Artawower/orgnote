package handlers

import (
	"orgnote/app/models"

	"github.com/gofiber/fiber/v2"
)

type OrgNoteMetaService interface {
	GetChangesFrom(version string) *models.OrgNoteClientUpdateInfo
	GetLatestChange() *models.OrgNoteClientUpdateInfo
	GetEnvironmentInfo() models.EnvironmentInfo
}

type SystemInfoHandler struct {
	metaService OrgNoteMetaService
}

func NewSystemInfoHandler(metaService OrgNoteMetaService) *SystemInfoHandler {
	return &SystemInfoHandler{metaService: metaService}
}

// ClientUpdateInfo godoc
// @Summary      GetUpdatesFromVersion
// @Description
// @Tags         system info
// @Accept       json
// @Produce      json
// @Param        version path string true "provider"
// @Success      200  {object}  models.OrgNoteClientUpdateInfo
// @Failure      400  {object}  handlers.HttpError[any]
// @Failure      404  {object}  handlers.HttpError[any]
// @Failure      500  {object}  handlers.HttpError[any]
// @Router       /system-info/client-update/{version} [get]
func (s *SystemInfoHandler) ClientVersion(c *fiber.Ctx) error {
	version := c.Params("version")
	updateInfo := s.metaService.GetChangesFrom(version)
	if updateInfo == nil {
		return c.Status(fiber.StatusNoContent).JSON(fiber.Map{})
	}
	return c.JSON(updateInfo)
}

// LatestClientUpdateInfo godoc
// @Summary      GetLatestClientUpdate
// @Description
// @Tags         system info
// @Accept       json
// @Produce      json
// @Success      200  {object}  models.OrgNoteClientUpdateInfo
// @Failure      404  {object}  handlers.HttpError[any]
// @Failure      500  {object}  handlers.HttpError[any]
// @Router       /system-info/client-update/latest [get]
func (s *SystemInfoHandler) LatestClientUpdate(c *fiber.Ctx) error {
	updateInfo := s.metaService.GetLatestChange()
	if updateInfo == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{})
	}
	return c.JSON(updateInfo)
}

type SystemInfo struct {
	Environment models.EnvironmentInfo          `json:"environment"`
	Update      *models.OrgNoteClientUpdateInfo `json:"update"`
}

// Function to get system info, including env.CHECK_URL

// @Summary      GetSystemInfo
// @Description  Get system info
// @Tags         system info
// @Accept       json
// @Produce      json
// @Param        version path string true "provider"
// @Success      200  {object}  SystemInfo
// @Failure      500  {object}  handlers.HttpError[any]
// @Router       /system-info/{version} [get]
func (s *SystemInfoHandler) SystemInfo(c *fiber.Ctx) error {
	systemInfo := s.metaService.GetEnvironmentInfo()
	version := c.Params("version")
	updateInfo := s.metaService.GetChangesFrom(version)

	systemMetadata := SystemInfo{
		Environment: systemInfo,
		Update:      updateInfo,
	}

	return c.JSON(systemMetadata)
}

func RegisterSystemInfoHandler(app fiber.Router, metaService OrgNoteMetaService) {
	handler := NewSystemInfoHandler(metaService)
	app.Get("/system-info/:version", handler.SystemInfo)
	app.Get("/system-info/client-update/latest", handler.LatestClientUpdate)
	app.Get("/system-info/client-update/:version", handler.ClientVersion)
}
