package models

type GraphNoteNode struct {
	ID     string `json:"id" bson:"id"`
	Title  string `json:"title" bson:"title"`
	Weight int    `json:"weight" bson:"weight"`
}

type GraphNoteLink struct {
	Source string `json:"source" bson:"source"`
	Target string `json:"target" bson:"target"`
}

type NoteGraph struct {
	Nodes []GraphNoteNode `json:"nodes" bson:"nodes"`
	Links []GraphNoteLink `json:"links" bson:"links"`
}
