package services

import (
	"fmt"
	"orgnote/app/configs"
	"orgnote/app/models"
	"orgnote/app/tools"
	"net/url"
	"regexp"
	"strings"

	"github.com/google/go-github/github"
	"github.com/robfig/cron/v3"
	"github.com/rs/zerolog/log"
	"golang.org/x/mod/semver"
)

var commitPrefixPattern = regexp.MustCompile(`^(?:- )?(?:[a-f0-9]{6,} )?[a-z]+: `)

const maxReleasesToFetch = 10

var devHostnames = map[string]bool{
	"localhost":        true,
	"127.0.0.1":        true,
	"dev.org-note.com": true,
}

type OrgNoteMetaConfig struct {
	ClientRepoName   string
	ClientRepoOwner  string
	DisableScheduler *bool
}

type OrgNoteMetaService struct {
	repoConfig       OrgNoteMetaConfig
	config           configs.Config
	cachedClientInfo *github.RepositoryRelease
	queue            *cron.Cron
}

func NewOrgNoteMetaService(repoConfig OrgNoteMetaConfig, config configs.Config) *OrgNoteMetaService {
	metaService := &OrgNoteMetaService{repoConfig, config, nil, nil}
	if repoConfig.DisableScheduler == nil || !*repoConfig.DisableScheduler {
		metaService.RunScheduler()
	}
	return metaService
}

func isDevEnvironment(config configs.Config) bool {
	if config.Debug {
		return true
	}
	if config.BackendURL == "" {
		return false
	}
	parsed, err := url.Parse(config.BackendURL)
	if err != nil || parsed.Hostname() == "" {
		return false
	}
	return devHostnames[parsed.Hostname()]
}

func (o *OrgNoteMetaService) selectLatestRelease(releases []*github.RepositoryRelease) *github.RepositoryRelease {
	if len(releases) == 0 {
		return nil
	}

	if isDevEnvironment(o.config) {
		return releases[0]
	}

	for _, r := range releases {
		if !r.GetPrerelease() {
			return r
		}
	}
	return nil
}

func (o *OrgNoteMetaService) LoadClientMeta() error {
	client := github.NewClient(nil)
	ctx, _ := tools.DefaultContextTimeout()

	releases, _, err := client.Repositories.ListReleases(ctx, o.repoConfig.ClientRepoOwner, o.repoConfig.ClientRepoName, &github.ListOptions{PerPage: maxReleasesToFetch})
	if err != nil {
		return fmt.Errorf("orgnote meta: load client releases: %w", err)
	}

	release := o.selectLatestRelease(releases)
	if release == nil {
		return fmt.Errorf("orgnote meta: no suitable release found")
	}

	o.cachedClientInfo = release
	return nil
}

func (o *OrgNoteMetaService) LoadReleasesChanges() error {
	return fmt.Errorf("orgnote meta: load releases changes: method unimplemented yet")
}

func (o *OrgNoteMetaService) buildLatestChange() *models.OrgNoteClientUpdateInfo {
	if o.cachedClientInfo == nil || o.cachedClientInfo.TagName == nil {
		return nil
	}

	return &models.OrgNoteClientUpdateInfo{
		Version:   *o.cachedClientInfo.TagName,
		Url:       o.cachedClientInfo.GetHTMLURL(),
		ChangeLog: o.formatChangeLog(o.cachedClientInfo.Body),
	}
}

func (o *OrgNoteMetaService) GetChangesFrom(version string) *models.OrgNoteClientUpdateInfo {
	latestChange := o.buildLatestChange()
	if latestChange == nil {
		return nil
	}

	needUpdate := semver.Compare(tools.NormalizeVersion(version), tools.NormalizeVersion(latestChange.Version)) == -1
	if !needUpdate {
		return nil
	}

	return latestChange
}

func (o *OrgNoteMetaService) GetLatestChange() *models.OrgNoteClientUpdateInfo {
	return o.buildLatestChange()
}

func (o *OrgNoteMetaService) formatChangeLog(changeLog *string) string {
	if changeLog == nil {
		return ""
	}

	lines := strings.Split(*changeLog, "\n")
	formatted := make([]string, 0, len(lines))
	for _, line := range lines {
		formatted = append(formatted, commitPrefixPattern.ReplaceAllString(line, ""))
	}
	return strings.Join(formatted, "\n")

}

func (o *OrgNoteMetaService) RunScheduler() {
	if o.queue != nil {
		return
	}
	err := o.LoadClientMeta()
	if err != nil {
		log.Error().Msgf("orgnote meta: run scheduler: %s", err)
	}

	o.queue = cron.New()
	if _, err := o.queue.AddFunc("@every 30m", func() {
		err := o.LoadClientMeta()
		if err != nil {
			log.Error().Msgf("orgnote meta: run scheduler: %s", err)
		}
	}); err != nil {
		log.Error().Msgf("orgnote meta: add scheduler func: %s", err)
	}

	o.queue.Start()
}

func (o *OrgNoteMetaService) GetEnvironmentInfo() models.EnvironmentInfo {
	minClientVersion := ""
	if o.config.MinClientVersion != nil {
		minClientVersion = *o.config.MinClientVersion
	}

	return models.EnvironmentInfo{
		SelfHosted:       tools.IsEmpty(o.config.AccessCheckerURL) || tools.IsEmpty(o.config.AccessCheckToken),
		MinClientVersion: minClientVersion,
	}
}
