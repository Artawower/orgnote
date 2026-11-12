package models

type OrgNoteClientUpdateInfo struct {
	Version   string `json:"version"`
	ChangeLog string `json:"changeLog"`
	Url       string `json:"url"`
}
