#!/usr/bin/env bash
# ============================================================
# Cake Delight - minikube deployment (Linux / macOS / Git Bash)
# ============================================================
#
#   ./scripts/k8s-deploy.sh
#
# Starts minikube if needed, builds the seven service images INSIDE the
# minikube Docker daemon, and applies every manifest in dependency order.
#
# Prerequisites: minikube and kubectl on PATH, and a running Docker daemon
# (minikube uses it as its driver).
# ============================================================

set -euo pipefail

cd "$(dirname "$0")/.."


# ------------------------------------------------------------
# 1. Cluster
# ------------------------------------------------------------

echo "==> Checking minikube"

if [ "$(minikube status --format '{{.Host}}' 2>/dev/null || true)" != "Running" ]; then
    echo "    starting minikube (this takes a few minutes)..."
    minikube start --driver=docker --cpus=4 --memory=6144
else
    echo "    already running"
fi

kubectl config use-context minikube


# ------------------------------------------------------------
# 2. Images
# ------------------------------------------------------------
#
# The manifests use imagePullPolicy: IfNotPresent with local tags, so the
# images must exist in minikube's own Docker daemon, not the host's.

echo "==> Pointing Docker at the minikube daemon"
eval "$(minikube -p minikube docker-env)"

echo "==> Building images inside minikube"
docker compose build


# ------------------------------------------------------------
# 3. Manifests
# ------------------------------------------------------------

echo "==> Namespace and secrets"
kubectl apply -f kubernetes/00-namespace.yaml
kubectl apply -f kubernetes/01-secrets.yaml

echo "==> Database schemas (ConfigMaps)"
kubectl apply -f kubernetes/database/

echo "==> Message broker"
kubectl apply -f kubernetes/rabbitmq/

echo "==> Microservices and their databases"
kubectl apply -f kubernetes/catalog/
kubectl apply -f kubernetes/rating/
kubectl apply -f kubernetes/order/
kubectl apply -f kubernetes/inventory/
kubectl apply -f kubernetes/notification/
kubectl apply -f kubernetes/analytics/

echo "==> API Gateway"
kubectl apply -f kubernetes/gateway/

echo "==> Autoscaling"
minikube addons enable metrics-server
kubectl apply -f kubernetes/hpa/


# ------------------------------------------------------------
# 4. Wait and report
# ------------------------------------------------------------

echo "==> Waiting for deployments to become available"
kubectl wait --namespace cake-delight \
    --for=condition=available --timeout=900s deployment --all

echo
kubectl get pods,services,hpa --namespace cake-delight

cat <<'EOF'

Open the application with:
  minikube service api-gateway -n cake-delight

Or port-forward to a fixed address:
  kubectl port-forward -n cake-delight service/api-gateway 8080:8080
  then open http://localhost:8080
EOF
