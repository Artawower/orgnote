package services

import (
	"fmt"
	"net/url"
	"orgnote/app/infrastructure"
	subscription "orgnote/app/infrastructure/generated"
	"orgnote/app/models"
	"orgnote/app/repositories"
	"strings"

	"github.com/oapi-codegen/runtime/types"
	"github.com/rs/zerolog/log"
)

type UserService struct {
	userRepository   *repositories.UserRepository
	fileMetadataRepo *repositories.FileMetadataRepository
	subscriptionAPI  *infrastructure.SubscriptionAPI
	activationDomain *string
}

func NewUserService(userRepository *repositories.UserRepository, fileMetadataRepo *repositories.FileMetadataRepository, subscriptionAPI *infrastructure.SubscriptionAPI, clientAddress string) *UserService {
	return &UserService{
		userRepository:   userRepository,
		fileMetadataRepo: fileMetadataRepo,
		subscriptionAPI:  subscriptionAPI,
		activationDomain: activationDomainFromClientAddress(clientAddress),
	}
}

func activationDomainFromClientAddress(clientAddress string) *string {
	trimmedAddress := strings.TrimSpace(clientAddress)
	if trimmedAddress == "" {
		return nil
	}

	parseTarget := trimmedAddress
	if !strings.Contains(parseTarget, "://") {
		parseTarget = "//" + parseTarget
	}

	parsedURL, err := url.Parse(parseTarget)
	if err != nil || parsedURL.Host == "" {
		return &trimmedAddress
	}

	activationDomain := parsedURL.Host
	return &activationDomain
}

func (u *UserService) FindOrCreate(user models.User) (*models.User, error) {
	log.Info().Str("provider", user.Provider).Str("externalId", user.ExternalID).Msg("Find or create user")
	createdUser, err := u.userRepository.CreateOrGet(user)
	if err != nil {
		return nil, fmt.Errorf("user service: find or create: %v", err)
	}

	if err := u.reconcileUserSubscription(createdUser); err != nil {
		log.Warn().Err(err).Msg("failed to reconcile user subscription on login")
	}

	return createdUser, nil
}

const reconciledActiveFallback = "reconciled"

func (u *UserService) reconcileUserSubscription(user *models.User) error {
	remoteInfo, err := u.subscriptionAPI.GetInfo(user.Provider, user.ExternalID)
	if err != nil {
		return err
	}
	if remoteInfo == nil {
		return nil
	}
	if !remoteInfo.IsActive {
		return nil
	}

	active := remoteInfo.Key
	if active == "" {
		active = reconciledActiveFallback
	}
	spaceLimit := int64(remoteInfo.SpaceLimit)

	if err := u.userRepository.UpdateActiveAndSpaceLimit(user.ID.Hex(), &active, &spaceLimit); err != nil {
		return err
	}

	user.Active = &active
	user.SpaceLimit = spaceLimit

	return nil
}

func (u *UserService) GetAPITokens(userID string) ([]models.APIToken, error) {
	tokens, err := u.userRepository.GetAPITokens(userID)
	if err != nil {
		return nil, fmt.Errorf("user service: get: %v", err)
	}
	return tokens, nil
}

func (u *UserService) FindUser(token string) (*models.UserPersonalInfo, error) {
	user, err := u.userRepository.FindUserByToken(token)
	if err != nil {
		return nil, fmt.Errorf("user service: find user: %v", err)
	}

	if err := u.reconcileUserSubscription(user); err != nil {
		log.Warn().Err(err).Msg("failed to reconcile user subscription on verify")
	}

	usedSpace, err := u.fileMetadataRepo.GetTotalSize(user.ID)
	if err != nil {
		return nil, fmt.Errorf("user service: find user: get used space: %v", err)
	}

	return mapToUserPersonalInfo(user, usedSpace), nil
}

func (u *UserService) CreateToken(user *models.User) (*models.APIToken, error) {
	token, err := u.userRepository.CreateAPIToken(user)
	if err != nil {
		return nil, fmt.Errorf("user service: create token: %v", err)
	}
	return token, nil
}

func (u *UserService) DeleteToken(user *models.User, tokenID string) error {
	err := u.userRepository.DeleteAPIToken(user, tokenID)
	if err != nil {
		return fmt.Errorf("user service: delete token: %v", err)
	}
	return nil
}

func (u *UserService) DeleteUser(user *models.User) error {
	err := u.userRepository.DeleteUser(user.ID.Hex())
	if err != nil {
		return fmt.Errorf("user service: delete user: %v", err)
	}
	return nil
}

func (u *UserService) Subscribe(user *models.User, token string, emailAddress *string) error {
	data, err := u.subscriptionAPI.ActivateSubscription(newSubscriptionActivation(user, token, emailAddress, u.activationDomain))
	if err != nil {
		return fmt.Errorf("user service: subscribe: activate subscription %v", err)
	}

	spaceLimit, err := subscriptionActivationSpaceLimit(data)
	if err != nil {
		return fmt.Errorf("user service: subscribe: %v", err)
	}

	err = u.userRepository.SetActivationKey(user.ID.Hex(), token)
	if err != nil {
		return fmt.Errorf("user service: subscribe: set active status: %v", err)
	}

	err = u.userRepository.UpdateSpaceLimitInfo(user.ID.Hex(), nil, &spaceLimit)
	if err != nil {
		return fmt.Errorf("user service: subscribe: update space limit info: %v", err)
	}
	return nil
}

func subscriptionActivationSpaceLimit(data *subscription.SubscriptionInfo) (int64, error) {
	if data == nil {
		return 0, fmt.Errorf("activation response is empty")
	}
	if data.SpaceLimit == nil {
		return 0, fmt.Errorf("activation response missing space limit")
	}
	if *data.SpaceLimit <= 0 {
		return 0, fmt.Errorf("activation response has invalid space limit")
	}
	return int64(*data.SpaceLimit), nil
}

func newSubscriptionActivation(user *models.User, token string, emailAddress *string, activationDomain *string) subscription.SubscriptionActivation {
	return subscription.SubscriptionActivation{
		ActivationDomain: activationDomain,
		Key:              token,
		Email:            subscriptionEmail(emailAddress),
		ExternalId:       user.ExternalID,
		ExternalEmail:    externalSubscriptionEmail(user.Email),
		ExternalProvider: &user.Provider,
	}
}

func subscriptionEmail(emailAddress *string) *types.Email {
	if emailAddress == nil {
		return nil
	}
	return (*types.Email)(emailAddress)
}

func externalSubscriptionEmail(userEmail string) *types.Email {
	if userEmail == "" {
		return nil
	}
	return (*types.Email)(&userEmail)
}

func mapToUserPersonalInfo(user *models.User, usedSpace int64) *models.UserPersonalInfo {
	return &models.UserPersonalInfo{
		ID:         user.ID.Hex(),
		Name:       user.Name,
		NickName:   user.NickName,
		AvatarURL:  user.AvatarURL,
		Email:      user.Email,
		ProfileURL: user.ProfileURL,
		SpaceLimit: user.SpaceLimit,
		UsedSpace:  usedSpace,
		Active:     user.Active,
	}
}
