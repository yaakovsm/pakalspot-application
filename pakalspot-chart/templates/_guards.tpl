{{/*
Guard against using 'latest' image tags and empty tags
*/}}
{{- define "noLatest" -}}
{{- $frontendTag := include "pakalspot-chart.imageTag" (dict "root" . "service" "frontend") -}}
{{- $backendTag := include "pakalspot-chart.imageTag" (dict "root" . "service" "backend") -}}
{{- $backend2Tag := include "pakalspot-chart.imageTag" (dict "root" . "service" "backend2") -}}
{{- if or (eq $frontendTag "latest") (eq $backendTag "latest") (eq $backend2Tag "latest") -}}
{{ fail "Do not use 'latest' image tags. Pin to a versioned tag." }}
{{- end -}}
{{- if and (eq $frontendTag "") (eq $backendTag "") (eq $backend2Tag "") -}}
{{ fail "Image tags must be specified. Use global.image.tag or service-specific image.tag" }}
{{- end -}}
{{- end -}}
