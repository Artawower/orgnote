package models

type NoteHeading struct {
	Level int    `json:"level"`
	Text  string `json:"text"`
}

type NoteLink struct {
	Url  string `json:"url"`
	Name string `json:"name"`
}

type category string

const (
	CategoryArticle  category = "article"
	CategoryBook     category = "book"
	CategorySchedule category = "schedule"
)

type NoteMeta struct {
	PreviewImg     *string        `json:"previewImg"`
	Title          *string        `json:"title"`
	Description    *string        `json:"description"`
	Category       *category      `json:"category"`
	Headings       *[]NoteHeading `json:"headings"`
	LinkedArticles *[]NoteLink    `json:"linkedArticles"`
	Published      bool           `json:"published"`
	ExternalLinks  *[]NoteLink    `json:"externalLinks"`
	Startup        *string        `json:"startup"`
	Tags           []string       `json:"tags"`
	Images         []string       `json:"images"`
}

type Note struct {
	ID      string      `json:"id"`
	Content interface{} `json:"content"`
	Meta    NoteMeta    `json:"meta"`
}
