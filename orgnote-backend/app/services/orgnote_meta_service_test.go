package services

import (
	"orgnote/app/configs"
	"testing"

	"github.com/gkampitakis/go-snaps/snaps"
	"github.com/google/go-github/github"
	"github.com/stretchr/testify/assert"
)

func TestGetLatestChangesReturnsCachedRelease(t *testing.T) {
	disableScheduler := true
	repoConfig := OrgNoteMetaConfig{
		DisableScheduler: &disableScheduler,
	}

	config := configs.Config{}
	orgNoteMetaService := NewOrgNoteMetaService(repoConfig, config)
	tag := "0.42.0"
	body := "release: 0.42.0\n- feat: latest changes"
	htmlURL := "https://example.com/release/0.42.0"
	orgNoteMetaService.cachedClientInfo = &github.RepositoryRelease{
		TagName: &tag,
		Body:    &body,
		HTMLURL: &htmlURL,
	}

	changes := orgNoteMetaService.GetLatestChange()

	if changes == nil {
		t.Fatal("expected latest changes")
	}
	if changes.Version != tag {
		t.Fatalf("expected version %s, got %s", tag, changes.Version)
	}
	if changes.Url != htmlURL {
		t.Fatalf("expected url %s, got %s", htmlURL, changes.Url)
	}
	if changes.ChangeLog != "0.42.0\nlatest changes" {
		t.Fatalf("expected changelog to be formatted, got %q", changes.ChangeLog)
	}
}

func TestChangelogShouldBeFormatted(t *testing.T) {
	link := `- 648596d release: 0.17.0
- 7796632 feat: ability to upload GPG keys from files
- 6b1970e feat: include encryption info to debug page
- 27f0c5e fix: actions block alignment for raw editor block widgets
- e63d2d3 fix: line class decorations for complex blocks inside quote block
- 40bba17 feat: encryption using orgnote api
- ed6286e feat: GPG encryption
- 7aa69fb feat: build main action toolbar from commands (#22)`

	disableScheduler := true
	repoConfig := OrgNoteMetaConfig{
		DisableScheduler: &disableScheduler,
	}

	config := configs.Config{}

	orgNoteMetaService := NewOrgNoteMetaService(repoConfig, config)

	formatted := orgNoteMetaService.formatChangeLog(&link)

	snaps.MatchSnapshot(t, formatted)

}

func TestIsDevEnvironment(t *testing.T) {
	tests := []struct {
		name   string
		config configs.Config
		want   bool
	}{
		{
			name: "debug mode",
			config: configs.Config{
				Debug:      true,
				BackendURL: "https://org-note.com",
			},
			want: true,
		},
		{
			name: "localhost backend",
			config: configs.Config{
				Debug:      false,
				BackendURL: "http://localhost:3000",
			},
			want: true,
		},
		{
			name: "127.0.0.1 backend",
			config: configs.Config{
				Debug:      false,
				BackendURL: "http://127.0.0.1:3000",
			},
			want: true,
		},
		{
			name: "dev org-note com",
			config: configs.Config{
				Debug:      false,
				BackendURL: "https://dev.org-note.com",
			},
			want: true,
		},
		{
			name: "production",
			config: configs.Config{
				Debug:      false,
				BackendURL: "https://org-note.com",
			},
			want: false,
		},
		{
			name: "not-localhost substring",
			config: configs.Config{
				Debug:      false,
				BackendURL: "https://not-localhost.org-note.com",
			},
			want: false,
		},
		{
			name: "empty backend URL",
			config: configs.Config{
				Debug:      false,
				BackendURL: "",
			},
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, isDevEnvironment(tt.config))
		})
	}
}

func TestSelectLatestRelease_DevIncludesPrerelease(t *testing.T) {
	disableScheduler := true
	repoConfig := OrgNoteMetaConfig{DisableScheduler: &disableScheduler}
	config := configs.Config{Debug: true}
	svc := NewOrgNoteMetaService(repoConfig, config)

	tag := "0.42.6"
	pre := true
	releases := []*github.RepositoryRelease{
		{TagName: &tag, Prerelease: &pre},
	}

	result := svc.selectLatestRelease(releases)
	assert.NotNil(t, result)
	assert.Equal(t, "0.42.6", result.GetTagName())
}

func TestSelectLatestRelease_ProdSkipsPrerelease(t *testing.T) {
	disableScheduler := true
	repoConfig := OrgNoteMetaConfig{DisableScheduler: &disableScheduler}
	config := configs.Config{BackendURL: "https://org-note.com"}
	svc := NewOrgNoteMetaService(repoConfig, config)

	preTag := "0.43.0"
	stableTag := "0.42.0"
	pre := true
	stable := false
	releases := []*github.RepositoryRelease{
		{TagName: &preTag, Prerelease: &pre},
		{TagName: &stableTag, Prerelease: &stable},
	}

	result := svc.selectLatestRelease(releases)
	assert.NotNil(t, result)
	assert.Equal(t, "0.42.0", result.GetTagName())
}

func TestSelectLatestRelease_ProdAllPrerelease(t *testing.T) {
	disableScheduler := true
	repoConfig := OrgNoteMetaConfig{DisableScheduler: &disableScheduler}
	config := configs.Config{BackendURL: "https://org-note.com"}
	svc := NewOrgNoteMetaService(repoConfig, config)

	tag := "0.43.0"
	pre := true
	releases := []*github.RepositoryRelease{
		{TagName: &tag, Prerelease: &pre},
	}

	result := svc.selectLatestRelease(releases)
	assert.Nil(t, result)
}

func TestSelectLatestRelease_EmptyList(t *testing.T) {
	disableScheduler := true
	repoConfig := OrgNoteMetaConfig{DisableScheduler: &disableScheduler}
	config := configs.Config{Debug: true}
	svc := NewOrgNoteMetaService(repoConfig, config)

	result := svc.selectLatestRelease(nil)
	assert.Nil(t, result)
}

func TestFormatChangeLog_PreservesDevMetadata(t *testing.T) {
	disableScheduler := true
	repoConfig := OrgNoteMetaConfig{DisableScheduler: &disableScheduler}
	config := configs.Config{}
	svc := NewOrgNoteMetaService(repoConfig, config)

	body := `Dev Build v0.42.6 Pre-release
Branch: dev
Commit: 1c3a11d
- feat: new feature`

	result := svc.formatChangeLog(&body)

	assert.Contains(t, result, "Branch: dev")
	assert.Contains(t, result, "Commit: 1c3a11d")
	assert.Contains(t, result, "Dev Build v0.42.6 Pre-release")
	assert.Contains(t, result, "new feature")
	assert.NotContains(t, result, "feat: new feature")
}

