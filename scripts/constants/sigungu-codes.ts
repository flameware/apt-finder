/**
 * 수도권 시군구 법정동코드 (앞 5자리)
 * Used for 국토교통부 공동주택 단지 목록 API calls
 * Source: 행정안전부 법정동 코드 체계
 */

export interface SigunguInfo {
  code: string; // 5-digit bjdong prefix
  name: string; // 시/군/구 이름
  region: "서울" | "경기" | "인천";
}

export const SIGUNGU_CODES: SigunguInfo[] = [
  // 서울 (11)
  { code: "11110", name: "서울 종로구", region: "서울" },
  { code: "11140", name: "서울 중구", region: "서울" },
  { code: "11170", name: "서울 용산구", region: "서울" },
  { code: "11200", name: "서울 성동구", region: "서울" },
  { code: "11215", name: "서울 광진구", region: "서울" },
  { code: "11230", name: "서울 동대문구", region: "서울" },
  { code: "11260", name: "서울 중랑구", region: "서울" },
  { code: "11290", name: "서울 성북구", region: "서울" },
  { code: "11305", name: "서울 강북구", region: "서울" },
  { code: "11320", name: "서울 도봉구", region: "서울" },
  { code: "11350", name: "서울 노원구", region: "서울" },
  { code: "11380", name: "서울 은평구", region: "서울" },
  { code: "11410", name: "서울 서대문구", region: "서울" },
  { code: "11440", name: "서울 마포구", region: "서울" },
  { code: "11470", name: "서울 양천구", region: "서울" },
  { code: "11500", name: "서울 강서구", region: "서울" },
  { code: "11530", name: "서울 구로구", region: "서울" },
  { code: "11545", name: "서울 금천구", region: "서울" },
  { code: "11560", name: "서울 영등포구", region: "서울" },
  { code: "11590", name: "서울 동작구", region: "서울" },
  { code: "11620", name: "서울 관악구", region: "서울" },
  { code: "11650", name: "서울 서초구", region: "서울" },
  { code: "11680", name: "서울 강남구", region: "서울" },
  { code: "11710", name: "서울 송파구", region: "서울" },
  { code: "11740", name: "서울 강동구", region: "서울" },

  // 경기 (41)
  { code: "41111", name: "수원 장안구", region: "경기" },
  { code: "41113", name: "수원 권선구", region: "경기" },
  { code: "41115", name: "수원 팔달구", region: "경기" },
  { code: "41117", name: "수원 영통구", region: "경기" },
  { code: "41131", name: "성남 수정구", region: "경기" },
  { code: "41133", name: "성남 중원구", region: "경기" },
  { code: "41135", name: "성남 분당구", region: "경기" },
  { code: "41150", name: "의정부시", region: "경기" },
  { code: "41171", name: "안양 만안구", region: "경기" },
  { code: "41173", name: "안양 동안구", region: "경기" },
  { code: "41190", name: "부천시", region: "경기" },
  { code: "41210", name: "광명시", region: "경기" },
  { code: "41220", name: "평택시", region: "경기" },
  { code: "41250", name: "동두천시", region: "경기" },
  { code: "41271", name: "안산 상록구", region: "경기" },
  { code: "41273", name: "안산 단원구", region: "경기" },
  { code: "41281", name: "고양 덕양구", region: "경기" },
  { code: "41285", name: "고양 일산동구", region: "경기" },
  { code: "41287", name: "고양 일산서구", region: "경기" },
  { code: "41290", name: "과천시", region: "경기" },
  { code: "41310", name: "구리시", region: "경기" },
  { code: "41360", name: "남양주시", region: "경기" },
  { code: "41370", name: "오산시", region: "경기" },
  { code: "41390", name: "시흥시", region: "경기" },
  { code: "41410", name: "군포시", region: "경기" },
  { code: "41430", name: "의왕시", region: "경기" },
  { code: "41450", name: "하남시", region: "경기" },
  { code: "41461", name: "용인 처인구", region: "경기" },
  { code: "41463", name: "용인 기흥구", region: "경기" },
  { code: "41465", name: "용인 수지구", region: "경기" },
  { code: "41480", name: "파주시", region: "경기" },
  { code: "41500", name: "이천시", region: "경기" },
  { code: "41550", name: "안성시", region: "경기" },
  { code: "41570", name: "김포시", region: "경기" },
  { code: "41590", name: "화성시", region: "경기" },
  { code: "41610", name: "광주시", region: "경기" },
  { code: "41630", name: "양주시", region: "경기" },
  { code: "41650", name: "포천시", region: "경기" },
  { code: "41670", name: "여주시", region: "경기" },

  // 인천 (28)
  { code: "28110", name: "인천 중구", region: "인천" },
  { code: "28140", name: "인천 동구", region: "인천" },
  { code: "28177", name: "인천 미추홀구", region: "인천" },
  { code: "28185", name: "인천 연수구", region: "인천" },
  { code: "28200", name: "인천 남동구", region: "인천" },
  { code: "28237", name: "인천 부평구", region: "인천" },
  { code: "28245", name: "인천 계양구", region: "인천" },
  { code: "28260", name: "인천 서구", region: "인천" },
  { code: "28710", name: "인천 강화군", region: "인천" },
];
