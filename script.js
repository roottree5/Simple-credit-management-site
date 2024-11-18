document.addEventListener('DOMContentLoaded', function() {
    const table = document.getElementById('gradeTable');
    const tbody = table.querySelector('tbody');
    const addButton = document.getElementById('addRow');
    const deleteButton = document.getElementById('deleteRow');
    const saveButton = document.getElementById('saveData');
    const sortButton = document.getElementById('sortData');
    const yearSelect = document.getElementById('yearSelect');

    // 정렬 상태를 저장하는 객체
    let sortState = {
        column: 'completion',
        ascending: true
    };

    addButton.addEventListener('click', addNewRow);
    deleteButton.addEventListener('click', deleteSelectedRows);
    saveButton.addEventListener('click', saveAndCalculate);
    sortButton.addEventListener('click', sortData);
    yearSelect.addEventListener('change', filterByYear);

    // 정렬 가능한 컬럼 클릭 이벤트 추가
    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.sort;
            if (sortState.column === column) {
                sortState.ascending = !sortState.ascending;
            } else {
                sortState.column = column;
                sortState.ascending = true;
            }
            sortData();
            updateSortIndicators();
        });
    });

    function addNewRow() {
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td><input type="checkbox"></td>
            <td>
                <select class="completion">
                    <option value="교양">교양</option>
                    <option value="전공">전공</option>
                </select>
            </td>
            <td>
                <select class="requirement">
                    <option value="필수">필수</option>
                    <option value="선택">선택</option>
                </select>
            </td>
            <td><input type="text" class="subject" required></td>
            <td><input type="number" class="credit" min="1" max="3" required></td>
            <td><input type="number" class="attendance" min="0" max="20" required></td>
            <td><input type="number" class="assignment" min="0" max="20" required></td>
            <td><input type="number" class="midterm" min="0" max="30" required></td>
            <td><input type="number" class="final" min="0" max="30" required></td>
            <td class="total"></td>
            <td class="grade"></td>
        `;
        newRow.setAttribute('data-year', yearSelect.value);
        tbody.appendChild(newRow);
        addInputListeners(newRow);
        
        // 행 선택 이벤트
        newRow.addEventListener('click', function(e) {
            if (e.target.type !== 'checkbox' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'INPUT') {
                const checkbox = this.querySelector('input[type="checkbox"]');
                checkbox.checked = !checkbox.checked;
                this.classList.toggle('selected');
            }
        });
        
        calculateTotal();
    }

    function addInputListeners(row) {
        // 모든 입력 필드에 대한 이벤트 리스너
        const inputs = row.querySelectorAll('input[type="number"], select');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                validateInput(input);
                calculateRow(row);
            });
        });

        // 과목명 입력 필드에 대한 이벤트 리스너
        const subjectInput = row.querySelector('.subject');
        subjectInput.addEventListener('change', () => {
            if (!checkDuplicateSubject(subjectInput)) {
                subjectInput.value = '';
                subjectInput.focus();
            }
        });

        // 학점 입력에 대한 특별 처리
        const creditInput = row.querySelector('.credit');
        creditInput.addEventListener('change', () => {
            const credit = parseInt(creditInput.value);
            if (credit === 1) {
                // 1학점일 경우 다른 점수 입력 필드 비활성화
                row.querySelectorAll('.attendance, .assignment, .midterm, .final').forEach(input => {
                    input.disabled = true;
                    input.value = '';
                });
                calculateRow(row);
            } else {
                // 그 외의 경우 입력 필드 활성화
                row.querySelectorAll('.attendance, .assignment, .midterm, .final').forEach(input => {
                    input.disabled = false;
                });
            }
        });
    }

    function validateInput(input) {
        const value = parseInt(input.value);
        const min = parseInt(input.min);
        const max = parseInt(input.max);
        
        if (isNaN(value) || value < min || value > max) {
            input.classList.add('input-error');
            return false;
        }
        
        input.classList.remove('input-error');
        return true;
    }

    function calculateRow(row) {
        const credit = parseInt(row.querySelector('.credit').value) || 0;

        if (credit === 1) {
            // 1학점 과목은 Pass/Non Pass 처리
            row.querySelector('.grade').textContent = 'P';
            row.querySelector('.total').textContent = '-';
            return;
        }

        const attendance = parseInt(row.querySelector('.attendance').value) || 0;
        const assignment = parseInt(row.querySelector('.assignment').value) || 0;
        const midterm = parseInt(row.querySelector('.midterm').value) || 0;
        const final = parseInt(row.querySelector('.final').value) || 0;

        if (!validateInputs(row)) return;

        const total = Math.min(attendance + assignment + midterm + final, 100);
        row.querySelector('.total').textContent = total;

        const grade = calculateGrade(total);
        const gradeCell = row.querySelector('.grade');
        gradeCell.textContent = grade;
        gradeCell.classList.toggle('grade-f', grade === 'F');

        calculateTotal();
    }

    function validateInputs(row) {
        const inputs = row.querySelectorAll('input[type="number"]');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!validateInput(input)) {
                isValid = false;
            }
        });

        // 총점 검증
        const attendance = parseInt(row.querySelector('.attendance').value) || 0;
        const assignment = parseInt(row.querySelector('.assignment').value) || 0;
        const midterm = parseInt(row.querySelector('.midterm').value) || 0;
        const final = parseInt(row.querySelector('.final').value) || 0;
        
        const total = attendance + assignment + midterm + final;
        if (total > 100) {
            alert('과목별 총점은 100을 초과할 수 없습니다.');
            isValid = false;
        }

        return isValid;
    }

    function calculateTotal() {
        const rows = tbody.querySelectorAll('tr');
        let totalCredits = 0;
        let totalAttendance = 0;
        let totalAssignment = 0;
        let totalMidterm = 0;
        let totalFinal = 0;
        let totalSum = 0;
        let courseCount = 0;

        rows.forEach(row => {
            if (row.style.display !== 'none') {
                const credit = parseInt(row.querySelector('.credit').value) || 0;
                const grade = row.querySelector('.grade').textContent;

                // Pass 과목과 F 학점은 계산에서 제외
                if (credit !== 1 && grade !== 'F' && grade !== 'P' && grade !== 'NP') {
                    const attendance = parseInt(row.querySelector('.attendance').value) || 0;
                    const assignment = parseInt(row.querySelector('.assignment').value) || 0;
                    const midterm = parseInt(row.querySelector('.midterm').value) || 0;
                    const final = parseInt(row.querySelector('.final').value) || 0;
                    const total = parseInt(row.querySelector('.total').textContent) || 0;

                    totalCredits += credit;
                    totalAttendance += attendance;
                    totalAssignment += assignment;
                    totalMidterm += midterm;
                    totalFinal += final;
                    totalSum += total;
                    courseCount++;
                }
            }
        });

        // 합계 표시
        document.getElementById('totalCredits').textContent = totalCredits;
        document.getElementById('totalAttendance').textContent = totalAttendance;
        document.getElementById('totalAssignment').textContent = totalAssignment;
        document.getElementById('totalMidterm').textContent = totalMidterm;
        document.getElementById('totalFinal').textContent = totalFinal;
        document.getElementById('totalSum').textContent = totalSum;
        
        // 평균 성적 계산 및 표시
        const averageGrade = courseCount ? calculateGrade(totalSum / courseCount) : 'N/A';
        document.getElementById('totalGrade').textContent = averageGrade;
    }

    function calculateGrade(score) {
        if (score >= 95) return 'A+';
        if (score >= 90) return 'A0';
        if (score >= 85) return 'B+';
        if (score >= 80) return 'B0';
        if (score >= 75) return 'C+';
        if (score >= 70) return 'C0';
        if (score >= 65) return 'D+';
        if (score >= 60) return 'D0';
        return 'F';
    }

    function deleteSelectedRows() {
        const checkboxes = tbody.querySelectorAll('input[type="checkbox"]:checked');
        let deletedCount = 0;
        
        checkboxes.forEach(checkbox => {
            tbody.removeChild(checkbox.closest('tr'));
            deletedCount++;
        });
        
        if (deletedCount > 0) {
            if (tbody.children.length === 0) {
                addNewRow(); // 모든 행이 삭제된 경우에만 새로운 행 추가
            }
            calculateTotal();
            alert(`${deletedCount}개의 행이 삭제되었습니다.`);
        }
    }

    function saveAndCalculate() {
        if (validateAllRows()) {
            calculateTotal();
            sortData();
            alert('데이터가 저장되었습니다.');
        }
    }

    function validateAllRows() {
        const rows = tbody.querySelectorAll('tr');
        let isValid = true;

        rows.forEach(row => {
            if (!validateInputs(row)) {
                isValid = false;
            }
            
            const subjectInput = row.querySelector('.subject');
            if (!subjectInput.value.trim()) {
                subjectInput.classList.add('input-error');
                isValid = false;
            }
        });

        if (!isValid) {
            alert('입력값을 확인해주세요.');
        }

        return isValid;
    }

    function sortData() {
        const rows = Array.from(tbody.querySelectorAll('tr'));
        
        rows.sort((a, b) => {
            const getValue = (row, className) => {
                const element = row.querySelector(`.${className}`);
                return element.tagName === 'SELECT' ? element.value : element.value || element.textContent;
            };

            const aValue = getValue(a, sortState.column);
            const bValue = getValue(b, sortState.column);

            let comparison = aValue.localeCompare(bValue, 'ko');
            return sortState.ascending ? comparison : -comparison;
        });

        // DOM 업데이트
        rows.forEach(row => tbody.appendChild(row));
        updateSortIndicators();
        calculateTotal();
    }

    function updateSortIndicators() {
        // 모든 정렬 표시자 제거
        document.querySelectorAll('th.sortable').forEach(th => {
            th.classList.remove('sort-indicator', 'desc');
        });

        // 현재 정렬 컬럼에 표시자 추가
        const currentTh = document.querySelector(`th[data-sort="${sortState.column}"]`);
        currentTh.classList.add('sort-indicator');
        if (!sortState.ascending) {
            currentTh.classList.add('desc');
        }
    }

    function filterByYear() {
        const selectedYear = yearSelect.value;
        const rows = tbody.querySelectorAll('tr');
        
        rows.forEach(row => {
            const yearData = row.getAttribute('data-year');
            row.style.display = (yearData === selectedYear || selectedYear === 'all') ? '' : 'none';
        });
        
        calculateTotal();
    }

    function checkDuplicateSubject(subjectInput) {
        const currentRow = subjectInput.closest('tr');
        const subjectValue = subjectInput.value.trim().toLowerCase();
        
        if (!subjectValue) return true;

        const subjects = Array.from(tbody.querySelectorAll('.subject')).filter(input => 
            input !== subjectInput && 
            input.closest('tr').querySelector('.grade').textContent !== 'F'
        );

        const isDuplicate = subjects.some(input => 
            input.value.trim().toLowerCase() === subjectValue
        );

        if (isDuplicate) {
            alert('동일한 과목이 이미 존재합니다. (F 학점 제외)');
            return false;
        }

        return true;
    }

    // 초기 행 추가
    addNewRow();
});