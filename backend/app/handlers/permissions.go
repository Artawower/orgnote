package handlers

const (
	PublicRouteGetNotes     = "GetNotes"
	PublicRouteGetNote      = "GetNote"
	PrivateRouteCreateNote  = "CreateNote"
	PrivateRouteUpdateNotes = "UpdateNotes"
)

var PrivateRoutes = []string{PrivateRouteCreateNote, PrivateRouteUpdateNotes}

func IsPrivateRoute(route string) bool {
	for _, r := range PrivateRoutes {
		if r == route {
			return true
		}
	}
	return false
}
