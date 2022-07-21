package models

import "time"

type User struct {
	ID                  int64     `json:"id" bson:"_id"`
	Provider            string    `json:"provider" bson:"provider"`
	Email               string    `json:"email" bson:"email"`
	Name                string    `json:"name" bson:"name"`
	FirstName           string    `json:"firstName" bson:"firstName"`
	LastName            string    `json:"lastName" bson:"lastName"`
	NickName            string    `json:"nickName" bson:"nickName"`
	ExternalID          string    `json:"externalId" bson:"externalId"`
	AvatarURL           string    `json:"avatar" bson:"avatar"`
	Token               string    `json:"token" bson:"token"`
	RefreshToken        *string   `json:"refreshToken" bson:"refreshToken"`
	TokenExpirationDate time.Time `json:"tokenExpiration" bson:"tokenExpiration"`
	ProfileURL          string    `json:"profileUrl" bson:"profileUrl"`
}
