package tools

import "strings"

func NormalizeVersion(version string) string {
	version = strings.ToLower(version)
	if version == "" {
		return "0.0.0"
	}
	if version[0] != 'v' {
		return "v" + version
	}

	return version
}
