package models

type EnvironmentInfo struct {
	SelfHosted       bool   `json:"selfHosted"`
	MinClientVersion string `json:"minClientVersion,omitempty"`
}
