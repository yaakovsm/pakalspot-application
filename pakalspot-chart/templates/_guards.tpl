{{/*
Guard against using 'latest' image tags and empty tags
*/}}
{{- define "noLatest" -}}
{{- $frontendTag := include "pakalspot-chart.imageTag" (dict "root" . "service" "frontend") -}}
{{- $backendTag := include "pakalspot-chart.imageTag" (dict "root" . "service" "backend") -}}
{{- if or (eq $frontendTag "latest") (eq $backendTag "latest") -}}
{{ fail "Do not use 'latest' image tags. Pin to a versioned tag." }}
{{- end -}}
{{- if and (eq $frontendTag "") (eq $backendTag "") -}}
{{ fail "Image tags must be specified. Use global.image.tag or service-specific image.tag" }}
{{- end -}}
{{- end -}}
