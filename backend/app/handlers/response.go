package handlers

type HttpError struct {
	Message string      `json:"message"`
	Data    interface{} `json:"data"`
}

func NewHttpError(message string, data interface{}) HttpError {
	return HttpError{
		Message: message,
		Data:    data,
	}
}

type HttpReponse struct {
	Data interface{} `json:"data"`
	Meta interface{} `json:"meta"`
}

func NewHttpReponse(data interface{}, meta interface{}) HttpReponse {
	return HttpReponse{
		Data: data,
		Meta: meta,
	}
}
