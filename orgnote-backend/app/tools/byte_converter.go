package tools

func ConvertBytes2Megabyte(bytes int64) float64 {
	return float64(bytes) / 1024 / 1024
}

func ConvertMegabyte2Bytes(mb int64) int64 {
	return int64(mb * 1024 * 1024)
}
