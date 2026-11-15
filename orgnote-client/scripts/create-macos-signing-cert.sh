#!/usr/bin/env bash
set -euo pipefail

DEFAULT_CERT_NAME="OrgNote Self Signed Code Signing"
CERT_NAME="${DEFAULT_CERT_NAME}"
CERT_PASSWORD=""
OUTPUT_DIR=".certs"
DAYS="${ORGNOTE_CERT_DAYS:-3650}"

print_usage() {
  cat >&2 <<EOF
Usage: $0 --password <p12-password> [--name <certificate-name>] [--output-dir <dir>]

Options:
  --password    Password for the exported .p12 file.
  --name        Certificate common name. Default: ${DEFAULT_CERT_NAME}
  --output-dir  Output directory. Default: .certs
  --help        Show this help.

Environment:
  ORGNOTE_CERT_DAYS  Certificate validity in days. Default: 3650
EOF
}

require_option_value() {
  if [ "$#" -lt 2 ] || [[ "${2:-}" == --* ]]; then
    echo "Missing value for $1" >&2
    print_usage
    exit 1
  fi
}

parse_args() {
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --password)
        require_option_value "$@"
        CERT_PASSWORD="$2"
        shift 2
        ;;
      --name)
        require_option_value "$@"
        CERT_NAME="$2"
        shift 2
        ;;
      --output-dir)
        require_option_value "$@"
        OUTPUT_DIR="$2"
        shift 2
        ;;
      --help)
        print_usage
        exit 0
        ;;
      *)
        echo "Unknown argument: $1" >&2
        print_usage
        exit 1
        ;;
    esac
  done

  if [ -z "${CERT_PASSWORD}" ] || [ -z "${CERT_NAME}" ] || [ -z "${OUTPUT_DIR}" ]; then
    print_usage
    exit 1
  fi
}

warn_if_output_dir_is_tracked() {
  if [[ "${OUTPUT_DIR}" = /* ]]; then
    return
  fi

  if ! command -v git >/dev/null 2>&1; then
    return
  fi

  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    return
  fi

  if git check-ignore -q "${OUTPUT_DIR}" 2>/dev/null; then
    return
  fi

  echo "Warning: ${OUTPUT_DIR} is not ignored by git; it will contain a private key." >&2
}

write_openssl_config() {
  cat > "${OPENSSL_CONFIG}" <<EOF
[req]
distinguished_name = dn
x509_extensions = v3_req
prompt = no

[dn]
CN = ${CERT_NAME}

[v3_req]
keyUsage = critical,digitalSignature
extendedKeyUsage = codeSigning
EOF
}

generate_certificate() {
  openssl req \
    -x509 \
    -newkey rsa:4096 \
    -sha256 \
    -nodes \
    -keyout "${KEY_PATH}" \
    -out "${CERT_PATH}" \
    -days "${DAYS}" \
    -config "${OPENSSL_CONFIG}"
}

export_p12() {
  openssl pkcs12 \
    -export \
    -legacy \
    -out "${P12_PATH}" \
    -inkey "${KEY_PATH}" \
    -in "${CERT_PATH}" \
    -name "${CERT_NAME}" \
    -passout "pass:${CERT_PASSWORD}"
}

write_base64_secret() {
  base64 -i "${P12_PATH}" | tr -d '\n' > "${BASE64_PATH}"
}

print_summary() {
  cat <<EOF
Created macOS self-signed signing certificate.

Identity name:
${CERT_NAME}

Files:
${P12_PATH}
${BASE64_PATH}

GitHub Secrets to set:
MACOS_SIGNING_IDENTITY = ${CERT_NAME}
MACOS_CERTIFICATE_PASSWORD = <the password passed to --password>
MACOS_CERTIFICATE_P12 = <contents of ${BASE64_PATH}>
EOF
}

parse_args "$@"
mkdir -p "${OUTPUT_DIR}"
chmod 700 "${OUTPUT_DIR}"
warn_if_output_dir_is_tracked

KEY_PATH="${OUTPUT_DIR}/orgnote-macos-self-signed.key"
CERT_PATH="${OUTPUT_DIR}/orgnote-macos-self-signed.crt"
P12_PATH="${OUTPUT_DIR}/orgnote-macos-self-signed.p12"
BASE64_PATH="${P12_PATH}.base64"
OPENSSL_CONFIG="${OUTPUT_DIR}/orgnote-macos-self-signed.openssl.cnf"

write_openssl_config
generate_certificate
export_p12
write_base64_secret
print_summary
