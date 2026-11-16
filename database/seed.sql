-- =====================================================================
-- RUN BKK — ข้อมูลเริ่มต้น (ใช้ตอนสร้าง DB ใหม่ด้วย npm run db:setup)
-- ใส่เฉพาะข้อมูลที่ตรวจสอบกับแหล่งจริงแล้วเท่านั้น
--   - clubs: 6 คลับ ตรงกับข้อมูลบนเว็บจริง (Admin ตรวจกับ Instagram ของแต่ละคลับแล้ว)
--   - run_sessions: ไม่ใส่ — กิจกรรมมีวันหมดอายุ Admin กรอกผ่านหน้า Admin ของเว็บ
--   - users: ไม่ใส่ — รหัสผ่านต้อง hash ด้วย bcrypt → สมัครผ่านเว็บ แล้วใช้ npm run make-admin
-- =====================================================================

SET NAMES utf8mb4;

INSERT INTO clubs (name, description, location, regular_schedule, instagram_url, image, status) VALUES
(
  'Cruise Control Run Club',
  'มีรูปแบบกิจกรรมหลัก 3 แบบ ได้แก่ Social Run วิ่งเบาๆ 5-6 กิโลเพื่อความสนุก, City Run วิ่งสำรวจเมืองเดือนละครั้ง และ Long Run สำหรับเพิ่มความทนทาน เน้นบรรยากาศเป็นกันเอง ไม่แข่งขัน ใครก็เข้าร่วมได้',
  'Benjakitti Park (สวนเบญจกิตติ)',
  'ทุกวันอาทิตย์ เวลา 06.00-08.00 น.',
  'https://www.instagram.com/cruisecontrolrunclub/',
  '/image/club1.png',
  'published'
),
(
  'Sabai Run Club Bangkok',
  'เป็นคอมูนิตี้ที่ได้ทั้งการวิ่งและการเข้าสังคมพบปะผู้คน เน้นให้การวิ่งเป็นกิจกรรมที่เข้าได้กับทุกคน จัดวิ่งทุกๆ วันอาทิตย์ มีทั้งคนไทยและชาวต่างชาติ รวมถึงเซเลบริตี้มาเข้าร่วมคลับมากมาย ที่สำคัญไม่มีค่าใช้จ่ายและไม่ต้องลงทะเบียน',
  'สวนเบญจกิตติ ทางออก 9',
  'ทุกวันอาทิตย์ 7:15 น.',
  'https://www.instagram.com/sabairunclub.bkk/',
  '/image/club2.jpeg',
  'published'
),
(
  'MMRC Meep Meep Run Club',
  'มีกิจกรรม “Run, Jog & Walk Series” ร่วมกับพื้นที่สาธารณะ จัดขึ้นแบบฟรี เป็นเช้าวันหยุด คลับไร้ความกดดัน ร่วมกับสถานที่อย่าง theCOMMONS และอีเวนต์พิเศษ ทุกระดับเริ่มต้นด้วยการบรีฟแล้วต่อด้วยกาแฟและพูดคุย เหมาะสำหรับจ็อกเกอร์สบายๆ นักวิ่งจริงจัง และมือใหม่ที่กำลังเริ่มออกกำลัง',
  'สลับร้านกาแฟ: Bo BKK หรือ Slow Butter BKK',
  'ทุกวันเสาร์ เวลา 06:30 น.',
  'https://www.instagram.com/meepmeeprunclub/',
  '/image/club3.png',
  'published'
),
(
  'Monster Run Bkk',
  'มี City Run และ Event Collaboration จุดเด่นคือการสร้างบรรยากาศสนุกและเป็นกันเองในการวิ่งสำรวจเมือง เป็นทั้งกลุ่มวิ่งและแหล่งรวมคนรักการวิ่งที่เชื่อมโยงกันผ่านกิจกรรมและไลฟ์สไตล์การออกกำลังกาย',
  'สำรวจเมือง',
  'Community Run',
  'https://www.instagram.com/monster.runbkk/',
  '/image/club4.jpeg',
  'published'
),
(
  'CNX-BKK Brotherhood',
  'เป็นกลุ่มวิ่งที่ผสมผสานจิตวิญญาณของคนที่มาจากเชียงใหม่เข้ากับพลังของกรุงเทพฯ ได้อย่างลงตัว กลุ่มนี้นิยามตัวเองว่าเป็น “Daydrinker & Runner Club”',
  'theCOMMONS ศาลาแดง และตามอีเว้นต์',
  'ตามอีเว้นต์',
  'https://www.instagram.com/cnx_bkk.brotherhood/',
  '/image/club5.jpg',
  'published'
),
(
  'Ugly Running Training Club (URT)',
  'คอมมูนิตี้และคลับวิ่งแนวไลฟ์สไตล์ในกรุงเทพมหานคร ก่อตั้งขึ้นในปี 2022 ภายใต้สโลแกน \"RUN WITH YOUR OWN TRIBE\" คลับนี้โดดเด่นด้วยบรรยากาศสายสตรีทและพังก์ (Punk-vibe) ที่เน้นการวิ่งแบบเข้าสังคมมากกว่าการแข่งขันทำความเร็ว',
  'ประตู 3 สวนเบญจกิติ ใกล้โซนยืดเส้น',
  'ทุกเช้า เวลา 06:30 น.',
  'https://www.instagram.com/ugly_running_training_club/',
  '/image/club6.jpg',
  'published'
);
