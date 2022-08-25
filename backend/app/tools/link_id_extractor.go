package tools

// TODO: test
func ExportLinkID(link string) (id string, ok bool) {
	idPrefix := "id:"
	if len(link) <= len(idPrefix) || link[0:3] != idPrefix {
		id, ok = "", false
		return
	}
	return link[3:], true
}
