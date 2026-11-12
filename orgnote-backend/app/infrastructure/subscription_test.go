package infrastructure

import (
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	subscription "orgnote/app/infrastructure/generated"
	"strings"
	"testing"

	cache "github.com/Code-Hex/go-generics-cache"
)

func newTestSubscriptionAPI(t *testing.T, handler http.HandlerFunc) *SubscriptionAPI {
	t.Helper()

	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)

	token := "token"
	api, err := NewSubscription(http.Client{}, &server.URL, &token, cache.New[string, SubscriptionInfo], 1)
	if err != nil {
		t.Fatalf("failed to create subscription api: %v", err)
	}

	return api
}

type roundTripFunc func(req *http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

func TestSubscriptionCacheKey_SeparatesProviderAndExternalID(t *testing.T) {
	first := subscriptionCacheKey("ab", "c")
	second := subscriptionCacheKey("a", "bc")

	if first == second {
		t.Fatalf("expected cache keys to differ, got %q", first)
	}
}

func TestNewSubscription_UsesInjectedHTTPClient(t *testing.T) {
	requestWasSentThroughInjectedClient := false
	checkURL := "http://subscription.test"
	checkToken := "token"
	httpClient := http.Client{Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
		requestWasSentThroughInjectedClient = true
		return &http.Response{
			StatusCode: http.StatusOK,
			Header:     http.Header{"Content-Type": []string{"application/json"}},
			Body:       io.NopCloser(strings.NewReader(`{"spaceLimit":1024}`)),
		}, nil
	})}
	api, err := NewSubscription(httpClient, &checkURL, &checkToken, cache.New[string, SubscriptionInfo], 1)
	if err != nil {
		t.Fatalf("failed to create subscription api: %v", err)
	}

	_, err = api.ActivateSubscription(subscription.SubscriptionActivation{Key: "key", ExternalId: "42"})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !requestWasSentThroughInjectedClient {
		t.Fatal("expected request to use injected http client")
	}
}

func TestActivateSubscription_ReturnsResponseBody(t *testing.T) {
	api := newTestSubscriptionAPI(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"spaceLimit":1024}`))
	})

	info, err := api.ActivateSubscription(subscription.SubscriptionActivation{Key: "key", ExternalId: "42"})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if info == nil || info.SpaceLimit == nil || *info.SpaceLimit != 1024 {
		t.Fatalf("expected space limit 1024, got %v", info)
	}
}

func TestActivateSubscription_ReturnsErrorWhenResponseBodyMissing(t *testing.T) {
	api := newTestSubscriptionAPI(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	_, err := api.ActivateSubscription(subscription.SubscriptionActivation{Key: "key", ExternalId: "42"})

	if err == nil {
		t.Fatal("expected error for missing activation response body")
	}
}

func TestActivateSubscription_ReturnsErrorWhenStatusIsCreated(t *testing.T) {
	api := newTestSubscriptionAPI(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
	})

	_, err := api.ActivateSubscription(subscription.SubscriptionActivation{Key: "key", ExternalId: "42"})

	if err == nil {
		t.Fatal("expected error for unsupported activation response status")
	}
}

func TestActivateSubscription_ReturnsInvalidTokenError(t *testing.T) {
	api := newTestSubscriptionAPI(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	})

	_, err := api.ActivateSubscription(subscription.SubscriptionActivation{Key: "key", ExternalId: "42"})

	if !errors.Is(err, ErrorInvalidToken) {
		t.Fatalf("expected invalid token error, got %v", err)
	}
}

func TestActivateSubscription_InvalidatesCachedSubscriptionInfo(t *testing.T) {
	api := newTestSubscriptionAPI(t, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"spaceLimit":1024}`))
	})
	provider := "github"
	api.cache.Set(subscriptionCacheKey(provider, "42"), SubscriptionInfo{Email: "old@example.com"})

	_, err := api.ActivateSubscription(subscription.SubscriptionActivation{
		Key:              "key",
		ExternalId:       "42",
		ExternalProvider: &provider,
	})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := api.cache.Get(subscriptionCacheKey(provider, "42")); ok {
		t.Fatal("expected cached subscription info to be invalidated")
	}
}
