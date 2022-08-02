package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

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
	PreviewImg     *string        `json:"previewImg" bson:"previewImg"`
	Title          *string        `json:"title" bson:"title"`
	Description    *string        `json:"description" bson:"description"`
	Category       *category      `json:"category" bson:"category"`
	Headings       *[]NoteHeading `json:"headings" bson:"headings"`
	LinkedArticles *[]NoteLink    `json:"linkedArticles" bson:"linkedArticles"`
	Published      bool           `json:"published" bson:"published"`
	ExternalLinks  *[]NoteLink    `json:"externalLinks" bson:"externalLinks"`
	Startup        *string        `json:"startup" bson:"startup"`
	Tags           []string       `json:"tags" bson:"tags"`
	Images         []string       `json:"images" bson:"images"`
}

type Note struct {
	ID        string    `json:"id" bson:"_id"`
	AuthorID  string    `json:"authorId" bson:"authorId"`
	Content   bson.M    `json:"content" bson:"content"`
	Meta      NoteMeta  `json:"meta" bson:"meta"`
	CreatedAt time.Time `json:"createdAt" bson:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt" bson:"updatedAt"`
	Views     int       `json:"views" bson:"views"`
	Likes     int       `json:"likes" bson:"likes"`
}

type PublicNote struct {
	ID      string     `json:"id" bson:"_id"`
	Author  PublicUser `json:"author" bson:"author"`
	Content bson.M     `json:"content" bson:"content"`
	Meta    NoteMeta   `json:"meta" bson:"meta"`
}

type NoteFilter struct {
	UserID     *string `json:"userId"`
	SearchText *string `json:"searchText"`
	Limit      *int64  `json:"limit"`
	Offset     *int64  `json:"offset"`
}
