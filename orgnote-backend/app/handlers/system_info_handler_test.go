package handlers

import (
	"encoding/json"
	"net/http/httptest"
	"orgnote/app/models"
	"testing"

	"github.com/gofiber/fiber/v2"
)

type orgNoteMetaServiceStub struct {
	latestChange  *models.OrgNoteClientUpdateInfo
	changesByVers map[string]*models.OrgNoteClientUpdateInfo
}

func (s orgNoteMetaServiceStub) GetChangesFrom(version string) *models.OrgNoteClientUpdateInfo {
	return s.changesByVers[version]
}

func (s orgNoteMetaServiceStub) GetLatestChange() *models.OrgNoteClientUpdateInfo {
	return s.latestChange
}

func (s orgNoteMetaServiceStub) GetEnvironmentInfo() models.EnvironmentInfo {
	return models.EnvironmentInfo{}
}

func TestLatestRouteDoesNotConflictWithVersionParam(t *testing.T) {
	app := fiber.New()
	latest := &models.OrgNoteClientUpdateInfo{Version: "0.42.0", ChangeLog: "latest", Url: "https://example.com/latest"}
	RegisterSystemInfoHandler(app, orgNoteMetaServiceStub{
		latestChange: latest,
		changesByVers: map[string]*models.OrgNoteClientUpdateInfo{
			"0.41.0": {Version: "0.42.0", ChangeLog: "from version", Url: "https://example.com/from-version"},
		},
	})

	req := httptest.NewRequest("GET", "/system-info/client-update/latest", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("expected successful response, got error: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected status %d, got %d", fiber.StatusOK, resp.StatusCode)
	}

	var payload models.OrgNoteClientUpdateInfo
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("expected valid json, got error: %v", err)
	}
	if payload.ChangeLog != "latest" {
		t.Fatalf("expected latest route payload, got %q", payload.ChangeLog)
	}
}

func TestLatestClientUpdateReturnsNotFoundWhenMissing(t *testing.T) {
	app := fiber.New()
	RegisterSystemInfoHandler(app, orgNoteMetaServiceStub{})

	req := httptest.NewRequest("GET", "/system-info/client-update/latest", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("expected successful response, got error: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusNotFound {
		t.Fatalf("expected status %d, got %d", fiber.StatusNotFound, resp.StatusCode)
	}
}
