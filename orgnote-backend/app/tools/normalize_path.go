package tools

import "strings"

func NormalizeFilePath(path string) string {
	if strings.HasPrefix(path, "/") {
		return path
	}
	return "/" + path
}
