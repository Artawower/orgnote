package services

import (
	"fmt"
	"moonbrain/app/models"
	"moonbrain/app/repositories"
)

type UserService struct {
	userRepository *repositories.UserRepository
}

func NewUserService(userRepository *repositories.UserRepository) *UserService {
	return &UserService{userRepository}
}

func (u *UserService) Login(user models.User) (*models.User, error) {
	createdUser, err := u.userRepository.CreateOrGet(user)
	if err != nil {
		return nil, fmt.Errorf("user service: login: %v", err)
	}
	return createdUser, nil
}
