# Shukan Backend

## 開発環境のセットアップ

1. 依存パッケージをインストール:

```bash
npm install
```

2. 環境変数を設定:

```bash
cp .env.example .env
```

`.env`ファイルを編集して、必要な環境変数を設定してください：

```
OPENAI_API_KEY=your-actual-api-key
```

3. 開発サーバーを起動:

```bash
npm run dev
```

```bash
open http://localhost:3000
```

## ビルド

```bash
npm run build
npm start
```

## Cloud Runへのデプロイ

### 前提条件

- Google Cloud CLIがインストールされていること
- GCPプロジェクトが作成されていること
- プロジェクトのオーナーまたは編集者権限があること

### デプロイ手順

1. GCPプロジェクトIDを環境変数に設定:

```bash
export GCP_PROJECT_ID=your-project-id
```

2. **初回のみ** 必要な権限を設定:

```bash
./setup-permissions.sh
```

このスクリプトは以下を実行します：
- 必要なAPIの有効化（Cloud Build、Cloud Run、Artifact Registry）
- Compute Engineサービスアカウントに必要なIAMロールを付与

**注意**: 権限の反映には数分かかる場合があります。

3. 環境変数を設定してデプロイスクリプトを実行:

```bash
export OPENAI_API_KEY=your-actual-api-key
./deploy.sh
```

**環境変数について:**
- デプロイ時に環境変数`OPENAI_API_KEY`が設定されている場合、自動的にCloud Runサービスに設定されます
- 設定されていない場合は、後からGoogle Cloud Consoleで設定できます

**後からCloud Consoleで環境変数を設定する方法:**

```bash
gcloud run services update shukan-backend \
  --region asia-northeast1 \
  --set-env-vars OPENAI_API_KEY=your-actual-api-key
```

### 手動デプロイ

デプロイスクリプトを使わない場合は、以下のコマンドで手動デプロイできます:

```bash
gcloud run deploy shukan-backend \
  --source . \
  --region asia-northeast1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10
```
