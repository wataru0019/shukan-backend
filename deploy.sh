#!/bin/bash

# Cloud Runへのデプロイスクリプト

# 設定
PROJECT_ID="${GCP_PROJECT_ID}"
SERVICE_NAME="shukan-backend"
REGION="asia-northeast1"  # Tokyo region

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

echo -e "${GREEN}Cloud Runへのデプロイを開始します...${NC}"
echo "プロジェクトID: $PROJECT_ID"
echo "サービス名: $SERVICE_NAME"
echo "リージョン: $REGION"
echo ""

# GCPプロジェクトの設定
echo -e "${YELLOW}GCPプロジェクトを設定中...${NC}"
gcloud config set project $PROJECT_ID

# 環境変数のチェック
ENV_VARS_FLAG=""
if [ ! -z "$OPENAI_API_KEY" ]; then
    echo -e "${GREEN}環境変数 OPENAI_API_KEY が検出されました${NC}"
    ENV_VARS_FLAG="--set-env-vars OPENAI_API_KEY=$OPENAI_API_KEY"
else
    echo -e "${YELLOW}警告: OPENAI_API_KEY 環境変数が設定されていません${NC}"
    echo -e "${YELLOW}後でCloud Runコンソールから設定できます${NC}"
fi

# Cloud Runへのデプロイ
echo -e "${YELLOW}Cloud Runへデプロイ中...${NC}"
gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  $ENV_VARS_FLAG

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ デプロイが完了しました！${NC}"
    echo ""
    echo "サービスURL:"
    gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)'
else
    echo -e "${RED}✗ デプロイに失敗しました${NC}"
    exit 1
fi
