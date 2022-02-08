package models

import "time"

type Meta struct {
	Headings      []string `json:"headings"`
	Startups      []string `json:"startups"`
	ExternalLinks []string `json:"externalLinks"`
	InternalLinks []string `json:"internalLinks"`
	ChildrenIDs   []string `json:childrenIds`
}

type Article struct {
	ID          string      `json:"id"`
	Title       string      `json:"title"`
	Description string      `json:"description"`
	Tags        []string    `json:"tags"` // NOTE: might be a relation
	Active      bool        `json:"active"`
	Deleted     bool        `json:"deleted"`
	CreatedAt   time.Time   `json:"createdAt"`
	UpdatedAt   time.Time   `json:"updatedAt"`
	RawContent  string      `json:"rawContent"`
	Content     interface{} `json:"content"`
	Meta        Meta        `json:"meta"`
}
