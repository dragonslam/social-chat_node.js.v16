
// 강동 그린웨이 캠핑장 예약 Script. 예약 일자. 사이트 설정 후 실행 하자.
model.goNextMonth();
model.clickBookDate({"advance":false, "bookDay":true, "date": new Date(2024, 11, 21), "dateLabel":21, "sameMonth":true, "selected":true});
model.clickProduct({"status_code":"0","width":20,"product_name":"자작05","product_discount_fee":33000,"x_coordinate":461,"product_premium_fee":33000,"product_member_fee":0,"select_yn":"1","height":20,"product_eng_name":"tree5","product_code":"00013005","season_code":"0","y_coordinate":169,"sale_product_fee":33000,"product_fee":33000});
model.clickReservation();

model.clickBookDate({"advance":false, "bookDay":true, "date": new Date(2024, 10, 27), "dateLabel":21, "sameMonth":true, "selected":true});
model.clickProduct({"status_code":"0","width":20,"product_name":"자작05","product_discount_fee":33000,"x_coordinate":461,"product_premium_fee":33000,"product_member_fee":0,"select_yn":"1","height":20,"product_eng_name":"tree5","product_code":"00013005","season_code":"0","y_coordinate":169,"sale_product_fee":33000,"product_fee":33000});
model.clickReservation();

