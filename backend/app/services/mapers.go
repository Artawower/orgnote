package services

import "moonbrain/app/models"

func mapToPublicUserInfo(user *models.User) *models.PublicUser {
	return &models.PublicUser{
		ID:         user.ExternalID,
		Name:       user.Name,
		NickName:   user.NickName,
		AvatarURL:  user.AvatarURL,
		Email:      user.Email,
		ProfileURL: user.ProfileURL,
	}
}
