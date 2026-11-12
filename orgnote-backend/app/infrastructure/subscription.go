package infrastructure

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	subscription "orgnote/app/infrastructure/generated"
	"orgnote/app/tools"
	"strconv"
	"time"

	cache "github.com/Code-Hex/go-generics-cache"
	"github.com/rs/zerolog/log"
)

type SubscriptionAPI struct {
	checkURL      *string
	checkToken    *string
	client        *subscription.ClientWithResponses
	cache         *cache.Cache[string, SubscriptionInfo]
	cacheLifeTime int
}

type SubscriptionInfo struct {
	Email      string  `json:"email"`
	IsActive   bool    `json:"isActive"`
	SpaceLimit float64 `json:"spaceLimit"`
	Key        string  `json:"key"`
}

type SubscriptionRequestError struct {
	code int
}

func (e *SubscriptionRequestError) Error() string {
	return "access check request error, got status code " + strconv.FormatInt(int64(e.code), 10)
}

func (a *SubscriptionAPI) checkIsActive(info SubscriptionInfo) error {
	if !info.IsActive {
		return fmt.Errorf("user %s is not active", info.Email)
	}
	return nil
}

func (a *SubscriptionAPI) getRemoteInfo(provider string, externalID string) (*SubscriptionInfo, error) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)

	defer cancel()

	res, err := a.client.SubscriptionInfoRetrieve(ctx, provider, externalID, a.addAuthHeader)
	if err != nil {
		return nil, err
	}

	if res.StatusCode != http.StatusOK {
		return nil, &SubscriptionRequestError{res.StatusCode}
	}

	body, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}

	defer res.Body.Close()

	data := &SubscriptionInfo{}
	err = json.Unmarshal(body, &data)

	return data, err

}

func subscriptionCacheKey(provider string, externalID string) string {
	return provider + ":" + externalID
}

func (a *SubscriptionAPI) getInfo(provider string, externalID string) (*SubscriptionInfo, error) {
	key := subscriptionCacheKey(provider, externalID)
	cachedInfo, ok := a.cache.Get(key)

	if ok {
		return &cachedInfo, nil
	}

	accessInfo, err := a.getRemoteInfo(provider, externalID)
	if err != nil {
		return nil, err
	}

	a.cache.Set(key, *accessInfo, cache.WithExpiration(time.Duration(a.cacheLifeTime)*time.Minute))

	return accessInfo, err
}

func (a *SubscriptionAPI) Check(provider string, externalID string) error {
	if tools.IsEmpty(a.checkURL) || tools.IsEmpty(a.checkToken) {
		return nil
	}

	accessInfo, err := a.getInfo(provider, externalID)
	if err != nil {
		return err
	}

	return a.checkIsActive(*accessInfo)
}

func (a *SubscriptionAPI) GetInfo(provider string, externalID string) (*SubscriptionInfo, error) {
	if tools.IsEmpty(a.checkURL) || tools.IsEmpty(a.checkToken) {
		return nil, nil
	}

	return a.getInfo(provider, externalID)
}

func (a *SubscriptionAPI) addAuthHeader(ctx context.Context, req *http.Request) error {
	req.Header.Add("Authorization", "Token "+*a.checkToken)
	return nil
}

var ErrorInvalidToken = fmt.Errorf("invalid activation token")

func (a *SubscriptionAPI) ActivateSubscription(data subscription.SubscriptionActivation) (*subscription.SubscriptionInfo, error) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()

	// TODO: master map errors
	rspns, err := a.client.SubscriptionActivationCreateWithResponse(ctx, data)

	if err != nil {
		log.Info().Msgf("subscription: activate subscription: subscription request: %v", err)
		return nil, fmt.Errorf("subscription: subscribe: %v", err)
	}

	if rspns == nil || rspns.HTTPResponse == nil {
		return nil, fmt.Errorf("subscription: subscribe: empty response")
	}

	statusCode := rspns.HTTPResponse.StatusCode
	if statusCode == http.StatusNotFound {
		return nil, ErrorInvalidToken
	}

	if statusCode != http.StatusOK {
		return nil, fmt.Errorf("subscription: subscribe: got status code %v", statusCode)
	}

	if rspns.JSON200 == nil {
		return nil, fmt.Errorf("subscription: subscribe: missing response body")
	}

	a.invalidateActivationCache(data)

	return rspns.JSON200, nil
}

func (a *SubscriptionAPI) invalidateActivationCache(data subscription.SubscriptionActivation) {
	if data.ExternalProvider == nil || data.ExternalId == "" {
		return
	}
	a.cache.Delete(subscriptionCacheKey(*data.ExternalProvider, data.ExternalId))
}

type cacheFactory[K comparable, V any] func(...cache.Option[K, V]) *cache.Cache[K, V]

func NewSubscription(
	httpClient http.Client,
	checkURL *string,
	checkToken *string,
	cacheFactory cacheFactory[string, SubscriptionInfo],
	cacheLifeTime int,
) (*SubscriptionAPI, error) {
	// TODO: master use as dependency
	client, err := subscription.NewClientWithResponses(*checkURL, subscription.WithHTTPClient(&httpClient))

	if err != nil {
		return nil, fmt.Errorf("subscription: new subscription: init client: %v", err)
	}

	return &SubscriptionAPI{
		checkURL,
		checkToken,
		client,
		cacheFactory(),
		cacheLifeTime,
	}, nil
}
