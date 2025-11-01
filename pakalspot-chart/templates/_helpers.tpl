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
Component-specific labels (includes common labels + component label)
Usage:
  {{- include "pakalspot-chart.componentLabels" (dict "root" . "component" "backend") }}
*/}}
{{- define "pakalspot-chart.componentLabels" -}}
{{- $root := .root -}}
{{- $component := .component -}}
{{- include "pakalspot-chart.labels" $root }}
app.kubernetes.io/component: {{ $component }}
{{- end -}}

{{/*
Component-specific selector labels (includes selector labels + component + app)
Usage:
  {{- include "pakalspot-chart.componentSelectorLabels" (dict "root" . "component" "backend") }}
*/}}
{{- define "pakalspot-chart.componentSelectorLabels" -}}
{{- $root := .root -}}
{{- $component := .component -}}
{{- $compVals := index $root.Values $component -}}
{{- include "pakalspot-chart.selectorLabels" $root }}
app.kubernetes.io/component: {{ $component }}
{{- if index $compVals "appname" }}
app: {{ index $compVals "appname" }}
{{- end }}
{{- end -}}

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

{{/* ====================================================================== */}}
{{/*                           DRY POD SPEC HELPERS                          */}}
{{/* ====================================================================== */}}

{{/*
Common pod spec sections (imagePullSecrets, serviceAccountName, securityContext, nodeSelector, affinity, tolerations)
Usage:
  {{- include "pakalspot-chart.podSpec" . }}
*/}}
{{- define "pakalspot-chart.podSpec" -}}
{{- with .Values.global.imagePullSecrets }}
imagePullSecrets:
  {{- toYaml . | nindent 2 }}
{{- end }}
serviceAccountName: {{ include "pakalspot-chart.serviceAccountName" . }}
securityContext:
  {{- toYaml .Values.podSecurityContext | nindent 2 }}
{{- with .Values.nodeSelector }}
nodeSelector:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- with .Values.affinity }}
affinity:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- with .Values.tolerations }}
tolerations:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- end -}}

{{/* ====================================================================== */}}
{{/*                         DRY CONTAINER HELPERS                           */}}
{{/* ====================================================================== */}}

{{/*
Container common sections (env, envFrom, probes, resources, securityContext)
Usage:
  {{- include "pakalspot-chart.container" (dict "root" . "service" "backend") }}
*/}}
{{- define "pakalspot-chart.container" -}}
{{- $root := .root -}}
{{- $svc := .service -}}
{{- $svcVals := index $root.Values $svc -}}
{{- if $svcVals.env }}
env:
  {{- range $key, $value := $svcVals.env }}
  - name: {{ $key }}
    value: {{ $value | quote }}
  {{- end }}
{{- end }}
{{- if index $svcVals "envFrom" }}
envFrom:
  {{- toYaml (index $svcVals "envFrom") | nindent 2 }}
{{- end }}
{{- with index $svcVals "livenessProbe" }}
livenessProbe:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- with index $svcVals "readinessProbe" }}
readinessProbe:
  {{- toYaml . | nindent 2 }}
{{- end }}
{{- with index $svcVals "resources" }}
resources:
  {{- toYaml . | nindent 2 }}
{{- end }}
securityContext:
  {{- toYaml $root.Values.securityContext | nindent 2 }}
{{- end -}}

{{/* ====================================================================== */}}
{{/*                         DRY SERVICE HELPERS                              */}}
{{/* ====================================================================== */}}

{{/*
Generic service template for any component
Usage:
  {{- include "pakalspot-chart.service" (dict "root" . "component" "backend") }}
*/}}
{{- define "pakalspot-chart.service" -}}
{{- $root := .root -}}
{{- $component := .component -}}
{{- $compVals := index $root.Values $component -}}
{{- $name := $component -}}
{{- if eq $component "database" -}}
  {{- $name = "postgres" -}}
{{- end -}}
apiVersion: v1
kind: Service
metadata:
  name: {{ include "pakalspot-chart.fullname" $root }}-{{ $name }}
  labels:
    {{- include "pakalspot-chart.componentLabels" (dict "root" $root "component" $component) | nindent 4 }}
spec:
  type: {{ index $compVals.service "type" }}
  ports:
    - port: {{ index $compVals.service "port" }}
      targetPort: {{ index $compVals.service "targetPort" }}
      protocol: TCP
      name: {{ if eq $component "database" }}postgres{{ else }}http{{ end }}
  selector:
    {{- include "pakalspot-chart.componentSelectorLabels" (dict "root" $root "component" $component) | nindent 4 }}
{{- end -}}
