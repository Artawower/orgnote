package handlers

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/rs/zerolog/log"
)

var reservedNamesPattern = regexp.MustCompile(`(?i)^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)`)

type ErrorResponse struct {
	FailedField string
	Tag         string
	Value       string
}

type Validator struct {
	validator *validator.Validate
}

func NewValidator() *Validator {
	v := validator.New()
	if err := v.RegisterValidation("filepath", validateFilePath); err != nil {
		log.Error().Msgf("validator: register filepath validation: %s", err)
	}
	return &Validator{
		validator: v,
	}
}

func (v *Validator) Validate(data interface{}) []ErrorResponse {
	validationErrors := []ErrorResponse{}

	errs := v.validator.Struct(data)
	if errs == nil {
		return validationErrors
	}

	for _, err := range errs.(validator.ValidationErrors) {
		var elem ErrorResponse

		elem.FailedField = err.Field()
		elem.Tag = err.Tag()
		elem.Value = fmt.Sprintf("%v", err.Value())

		validationErrors = append(validationErrors, elem)
	}

	return validationErrors
}

func validateFilePath(fl validator.FieldLevel) bool {
	path := fl.Field().String()

	if path == "" {
		return false
	}

	normalizedPath := strings.TrimPrefix(path, "/")
	for _, part := range strings.Split(normalizedPath, "/") {
		if part == "" || part == ".." || reservedNamesPattern.MatchString(part) {
			return false
		}
	}

	return true
}
