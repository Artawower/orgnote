package handlers

type HttpError[T any] struct {
	Message string `json:"message"`
	Data    T      `json:"data"`
}

func NewHttpError[T any](message string, data T) HttpError[T] {
	return HttpError[T]{
		Message: message,
		Data:    data,
	}
}

type HttpResponse[T any, T2 any] struct {
	Data T  `json:"data"`
	Meta T2 `json:"meta"`
}

func NewHttpReponse[T any, T2 any](data T, meta T2) HttpResponse[T, T2] {
	return HttpResponse[T, T2]{
		Data: data,
		Meta: meta,
	}
}
