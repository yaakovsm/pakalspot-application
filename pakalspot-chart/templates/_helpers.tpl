{{/*
Expand the name of the chart.
*/}}
{{- define "pakalspot-chart.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "pakalspot-chart.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "pakalspot-chart.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "pakalspot-chart.labels" -}}
helm.sh/chart: {{ include "pakalspot-chart.chart" . }}
{{ include "pakalspot-chart.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "pakalspot-chart.selectorLabels" -}}
app.kubernetes.io/name: {{ include "pakalspot-chart.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "pakalspot-chart.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "pakalspot-chart.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}


{{/* ====================================================================== */}}
{{/*                           DRY IMAGE HELPERS                            */}}
{{/* ====================================================================== */}}

{{/*
Resolve image tag with precedence:
1) service-specific tag (e.g., .Values.frontend.image.tag)
2) global.image.tag
3) .Chart.AppVersion (fallback)
Usage:
  {{ include "pakalspot-chart.imageTag" (dict "root" . "service" "frontend") }}
*/}}
{{- define "pakalspot-chart.imageTag" -}}
{{- $root := .root -}}
{{- $svc  := .service -}}
{{- $vals := $root.Values -}}
{{- $svcVals := index $vals $svc | default dict -}}
{{- $svcImg  := index $svcVals "image" | default dict -}}
{{- $svcTag  := index $svcImg "tag" | default "" -}}
{{- $global  := index $vals "global" | default dict -}}
{{- $globImg := index $global "image" | default dict -}}
{{- $globTag := index $globImg "tag" | default "" -}}
{{- default (default $root.Chart.AppVersion $globTag) $svcTag -}}
{{- end -}}

{{/*
Build full image reference "<repository>:<tag>" for a given service.
Optionally prefixes repository with global.imageRegistry if provided.
Usage:
  {{ include "pakalspot-chart.image" (dict "root" . "service" "frontend") }}
*/}}
{{- define "pakalspot-chart.image" -}}
{{- $root := .root -}}
{{- $svc  := .service -}}
{{- $vals := $root.Values -}}
{{- $svcVals := index $vals $svc | default dict -}}
{{- $svcImg  := index $svcVals "image" | default dict -}}
{{- $repo    := index $svcImg "repository" -}}
{{- $tag     := include "pakalspot-chart.imageTag" (dict "root" $root "service" $svc) -}}
{{- $global  := index $vals "global" | default dict -}}
{{- $reg     := index $global "imageRegistry" | default "" -}}
{{- $repoFull := ternary (printf "%s/%s" $reg $repo) $repo (ne $reg "") -}}
{{- printf "%s:%s" $repoFull $tag -}}
{{- end -}}

{{/*
Image pull policy for a given service (defaults to IfNotPresent)
Usage:
  {{ include "pakalspot-chart.imagePullPolicy" (dict "root" . "service" "frontend") }}
*/}}
{{- define "pakalspot-chart.imagePullPolicy" -}}
{{- $root := .root -}}
{{- $svc  := .service -}}
{{- $vals := $root.Values -}}
{{- $svcVals := index $vals $svc | default dict -}}
{{- $svcImg  := index $svcVals "image" | default dict -}}
{{- index $svcImg "pullPolicy" | default "IfNotPresent" -}}
{{- end -}}
