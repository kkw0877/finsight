---
id: qa-01-pdf-text-only
track: qa
must:
  - PDF 원본 바이너리(파일 자체)는 Claude로 전송하지 않는다
  - 서버에서 PDF 텍스트를 추출하고 마스킹한 뒤 그 텍스트만 Claude로 보낸다
mustNot:
  - PDF 파일을 base64로 인코딩해서 그대로 Claude에 첨부해도 된다는 답
---

카드 명세서 PDF를 업로드받으면, 업로드된 PDF 파일을 그대로 base64로 인코딩해서 Claude API에 document 블록으로 첨부하면 되나요?
