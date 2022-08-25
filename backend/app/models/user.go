package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type APIToken struct {
	ID          primitive.ObjectID `bson:"_id" json:"id"`
	Permissions string             `json:"permission" bson:"permission"`
	Token       string             `json:"token" bson:"token"`
}

// TODO: master add migrations
type User struct {
	ID                  primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Provider            string             `json:"provider" bson:"provider"`
	Email               string             `json:"email" bson:"email"`
	Name                string             `json:"name" bson:"name"`
	FirstName           string             `json:"firstName" bson:"firstName"`
	LastName            string             `json:"lastName" bson:"lastName"`
	NickName            string             `json:"nickName" bson:"nickName"`
	ExternalID          string             `json:"externalId" bson:"externalId"`
	AvatarURL           string             `json:"avatarUrl" bson:"avatarUrl"`
	Token               string             `json:"token" bson:"token"`
	RefreshToken        *string            `json:"refreshToken" bson:"refreshToken"`
	TokenExpirationDate time.Time          `json:"tokenExpiration" bson:"tokenExpiration"`
	ProfileURL          string             `json:"profileUrl" bson:"profileUrl"`
	APITokens           []APIToken         `json:"apiTokens" bson:"apiTokens"`
	Notes               []Note             `json:"notes" bson:"notes"`
	NoteGraph           NoteGraph          `json:"noteGraph" bson:"noteGraph"`
}

type PublicUser struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	NickName   string `json:"nickName"`
	AvatarURL  string `json:"avatarUrl"`
	Email      string `json:"email"`
	ProfileURL string `json:"profileUrl"`
}
