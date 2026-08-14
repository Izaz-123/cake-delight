# ============================================================
# Cake Delight - minikube deployment (Windows / PowerShell)
# ============================================================
#
#   .\scripts\k8s-deploy.ps1
#
# Starts minikube if needed, builds the seven service images INSIDE the
# minikube Docker daemon, and applies every manifest in dependency order.
#
# Prerequisites: minikube and kubectl on PATH, and a running Docker Desktop
# (minikube uses it as its driver).
# ============================================================

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root


# ------------------------------------------------------------
# 1. Cluster
# ------------------------------------------------------------

Write-Host "==> Checking minikube" -ForegroundColor Cyan

$status = (minikube status --format "{{.Host}}" 2>$null)

if ($status -ne "Running") {
    Write-Host "    starting minikube (this takes a few minutes)..."
    minikube start --driver=docker --cpus=4 --memory=6144
} else {
    Write-Host "    already running"
}

kubectl config use-context minikube


# ------------------------------------------------------------
# 2. Images
# ------------------------------------------------------------
#
# The manifests use imagePullPolicy: IfNotPresent with local tags, so the
# images must exist in minikube's own Docker daemon, not the host's.

Write-Host "==> Pointing Docker at the minikube daemon" -ForegroundColor Cyan
& minikube -p minikube docker-env --shell powershell | Invoke-Expression

Write-Host "==> Building images inside minikube" -ForegroundColor Cyan
docker compose build


# ------------------------------------------------------------
# 3. Manifests
# ------------------------------------------------------------

Write-Host "==> Namespace and secrets" -ForegroundColor Cyan
kubectl apply -f kubernetes/00-namespace.yaml
kubectl apply -f kubernetes/01-secrets.yaml

Write-Host "==> Database schemas (ConfigMaps)" -ForegroundColor Cyan
kubectl apply -f kubernetes/database/

Write-Host "==> Message broker" -ForegroundColor Cyan
kubectl apply -f kubernetes/rabbitmq/

Write-Host "==> Microservices and their databases" -ForegroundColor Cyan
kubectl apply -f kubernetes/catalog/
kubectl apply -f kubernetes/rating/
kubectl apply -f kubernetes/order/
kubectl apply -f kubernetes/inventory/
kubectl apply -f kubernetes/notification/
kubectl apply -f kubernetes/analytics/

Write-Host "==> API Gateway" -ForegroundColor Cyan
kubectl apply -f kubernetes/gateway/

Write-Host "==> Autoscaling" -ForegroundColor Cyan
minikube addons enable metrics-server
kubectl apply -f kubernetes/hpa/


# ------------------------------------------------------------
# 4. Wait and report
# ------------------------------------------------------------

Write-Host "==> Waiting for deployments to become available" -ForegroundColor Cyan
kubectl wait --namespace cake-delight `
    --for=condition=available --timeout=900s deployment --all

Write-Host ""
kubectl get pods,services,hpa --namespace cake-delight

Write-Host ""
Write-Host "Open the application with:" -ForegroundColor Green
Write-Host "  minikube service api-gateway -n cake-delight"
Write-Host ""
Write-Host "Or port-forward to a fixed address:" -ForegroundColor Green
Write-Host "  kubectl port-forward -n cake-delight service/api-gateway 8080:8080"
Write-Host "  then open http://localhost:8080"
