// Socket.io 클라이언트 생성
const socket = io();

// 로그인 버튼 클릭 시
$('#login-btn').on('click', function(e) {
	e.preventDefault(); // 기본 동작 취소
	const oForm = document.getElementById('loginForm');
	if (oForm.checkValidity()) {
		const id = $('#member_id').val();
		const pwd= $('#member_pwd').val();
		socket.emit('upbit-login', id, pwd);	
	} else {
		oForm.reportValidity();
	}
});

// 자동 거래 시작 버튼 클릭 시
$('#start-btn').on('click', function() {
	// 선택된 화폐와 거래 조건을 서버로 전송하여 자동 거래 시작 요청
	const coin = $('#coin-select').val();
	const condition = {
		price: 5000, // 예시를 위해 단순히 가격이 5000 이하일 때 구매하는 조건으로 설정
		quantity: 1,
		sellPrice: 6000 // 예시를 위해 단순히 구매한 가격보다 높은 가격일 때 판매하는 조건으로 설정
	};
	socket.emit('upbit-start', coin, condition);
});

// 로그인 처리 결과를 수신하여 UI 업데이트
socket.on('upbit-loginResult', function(result) {
	if (result.success === true) {
		// 로그인 성공 시
		$('#login-form').addClass('d-none');
		$('#main-form').removeClass('d-none');
		// 잔액 정보 요청
		socket.emit('upbit-balance');
		// 거래 가능한 화폐 목록 요청
		socket.emit('upbit-coins');
	} else {
		// 로그인 실패 시
		alert(`로그인에 실패하였습니다.\n\n[${result?.code}] ${result?.message}`);
	}
});

// 잔액 정보를 수신하여 UI 업데이트
socket.on('upbit-balanceList', function(balance) {
	$('#balance-body').empty();
	for (const [coin, amount] of Object.entries(balance)) {
		const row = $('<tr>');
		row.append($('<td>').text(coin));
		row.append($('<td>').text(amount));
		$('#balance-body').append(row);
	}
});

// 거래 가능한 화폐 목록을 수신하여 UI 업데이트
socket.on('upbit-coins', function(coins) {
	$('#coin-select').empty();
	for (const coin of coins) {
		$('#coin-select').append($('<option>').text(coin));
	}
});

// 거래 로그를 수신하여 UI 업데이트
socket.on('log', function(log) {
	$('#log-list').prepend($('<li>').text(log));
});