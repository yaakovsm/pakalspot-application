{{/*
Guard against using 'latest' image tags
*/}}
{{- define "noLatest" -}}
{{- if or (eq .Values.frontend.image.tag "latest") (eq .Values.backend.image.tag "latest") -}}
{{ fail "Do not use 'latest' image tags. Pin to a versioned tag." }}
{{- end -}}
{{- end -}}
