---
id: qa-04-storage-path
track: qa
must:
  - "Storage 파일 경로는 서버가 생성한다: {user_id}/{upload.id}.csv 또는 {user_id}/{upload.id}.pdf 형태"
  - 사용자가 업로드한 원본 파일명은 경로에 사용하지 않는다
mustNot:
  - 사용자가 올린 원본 파일명을 그대로 Storage 경로로 써도 된다는 답
---

업로드 기능을 구현 중인데, Supabase Storage에 저장할 때 사용자가 올린 원본 파일명(예: "2026년1월카드명세서.csv")을 그대로 파일 경로로 써도 되나요?
