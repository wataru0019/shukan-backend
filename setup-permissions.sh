#!/bin/bash

# Cloud Run デプロイに必要な権限を設定するスクリプト

# 設定
PROJECT_ID="${GCP_PROJECT_ID}"

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# プロジェクトIDのチェック
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}エラー: GCP_PROJECT_ID環境変数が設定されていません${NC}"
    echo "使用方法: export GCP_PROJECT_ID=your-project-id"
    exit 1
fi

echo -e "${GREEN}Cloud Run デプロイに必要な権限を設定します...${NC}"
echo "プロジェクトID: $PROJECT_ID"
echo ""

# プロジェクト番号を取得
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

if [ -z "$PROJECT_NUMBER" ]; then
    echo -e "${RED}エラー: プロジェクト番号を取得できませんでした${NC}"
    exit 1
fi

echo "プロジェクト番号: $PROJECT_NUMBER"
echo ""

# Compute Engine のデフォルトサービスアカウント
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo -e "${YELLOW}必要なAPIを有効化しています...${NC}"

# 必要なAPIを有効化
gcloud services enable cloudbuild.googleapis.com --project=$PROJECT_ID
gcloud services enable run.googleapis.com --project=$PROJECT_ID
gcloud services enable artifactregistry.googleapis.com --project=$PROJECT_ID

echo ""
echo -e "${YELLOW}サービスアカウントに権限を付与しています...${NC}"
echo "サービスアカウント: $COMPUTE_SA"
echo ""

# Cloud Build Service Account ロールを付与
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${COMPUTE_SA}" \
    --role="roles/cloudbuild.builds.builder" \
    --condition=None

# Storage Admin ロールを付与（Cloud Build がソースコードを扱うため）
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${COMPUTE_SA}" \
    --role="roles/storage.admin" \
    --condition=None

# Artifact Registry Writer ロールを付与
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${COMPUTE_SA}" \
    --role="roles/artifactregistry.writer" \
    --condition=None

# Logs Writer ロールを付与
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${COMPUTE_SA}" \
    --role="roles/logging.logWriter" \
    --condition=None

echo ""
echo -e "${GREEN}✓ 権限の設定が完了しました！${NC}"
echo ""
echo -e "${YELLOW}注意: 権限の反映には数分かかる場合があります${NC}"
echo "数分待ってから、./deploy.sh を実行してください"
