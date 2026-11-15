-- =====================================================================
-- RUN BKK — ข้อมูลเริ่มต้น
-- ใส่เฉพาะข้อมูลที่ตรวจสอบกับแหล่งจริงแล้วเท่านั้น
--   - clubs: 5 คลับจากหน้า clubs.html เดิม (ตรวจกับ Instagram ของแต่ละคลับแล้ว)
--   - run_sessions: ยังว่าง — รอข้อมูลกิจกรรมที่ยืนยันแล้ว / ให้ Club Owner เพิ่มเอง
--   - users: บัญชี admin จะสร้างด้วยสคริปต์ใน Phase 4 (ต้อง hash รหัสด้วย bcrypt)
-- =====================================================================

SET NAMES utf8mb4;

INSERT INTO clubs (name, description, location, instagram_url, image, status) VALUES
(
  'Cruise Control Run Club',
  'มีรูปแบบกิจกรรมหลัก 3 แบบ ได้แก่ Social Run วิ่งเบาๆ 5-6 กิโลเพื่อความสนุก, City Run วิ่งสำรวจเมืองเดือนละครั้ง และ Long Run สำหรับเพิ่มความทนทาน เน้นบรรยากาศเป็นกันเอง ไม่แข่งขัน ใครก็เข้าร่วมได้',
  'Benjakitti Park (สวนเบญจกิตติ)',
  'https://www.instagram.com/cruisecontrolrunclub/',
  '/image/club1.png',
  'published'
),
(
  'Sabai Run Club Bangkok',
  'เป็นคอมูนิตี้ที่ได้ทั้งการวิ่งและการเข้าสังคมพบปะผู้คน เน้นให้การวิ่งเป็นกิจกรรมที่เข้าได้กับทุกคน จัดวิ่งทุกๆ วันอาทิตย์ มีทั้งคนไทยและชาวต่างชาติ รวมถึงเซเลบริตี้มาเข้าร่วมคลับมากมาย ที่สำคัญไม่มีค่าใช้จ่ายและไม่ต้องลงทะเบียน',
  'Benjakitti Park (สวนเบญจกิตติ)',
  'https://www.instagram.com/sabairunclub.bkk/',
  '/image/club2.jpeg',
  'published'
),
(
  'MMRC Meep Meep Run Club',
  'มีกิจกรรม “Run, Jog & Walk Series” ร่วมกับพื้นที่สาธารณะ จัดขึ้นแบบฟรี เป็นเช้าวันหยุด บรรยากาศเป็นกันเอง มีแบ่งกลุ่มตามสปีดและเน้นเรื่องชุมชน มิตรภาพ และความสนุกจากการออกกำลังกายร่วมกัน ไม่ใช่การแข่งขัน',
  'พื้นที่สาธารณะ',
  'https://www.instagram.com/meepmeeprunclub/',
  '/image/club3.png',
  'published'
),
(
  'Monster Run Bkk',
  'มี City Run และ Event Collaboration จุดเด่นคือการสร้างบรรยากาศสนุกและเป็นกันเองในการวิ่งสำรวจเมือง เป็นทั้งกลุ่มวิ่งและแหล่งรวมคนรักการวิ่งที่เชื่อมโยงกันผ่านกิจกรรมและไลฟ์สไตล์การออกกำลังกาย',
  'สำรวจเมือง',
  'https://www.instagram.com/monster.bkk/',
  '/image/club4.jpeg',
  'published'
),
(
  'CNX-BKK Brotherhood',
  'เป็นกลุ่มวิ่งที่ผสมผสานจิตวิญญาณของคนที่มาจากเชียงใหม่เข้ากับพลังของกรุงเทพฯ ได้อย่างลงตัว กลุ่มนี้นิยามตัวเองว่าเป็น “Daydrinker & Runner Club”',
  'ตามเส้นทางและอีเวนต์',
  'https://www.instagram.com/cnx_bkk.brotherhood/',
  '/image/club5.jpg',
  'published'
);
