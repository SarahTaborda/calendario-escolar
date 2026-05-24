// 1. Variáveis Globais e Conexão com Firebase
let agendamentosSimulados = [];

// Escuta o banco de dados em tempo real
database.ref('agendamentos').on('value', (snapshot) => {
    const dados = snapshot.val();
    agendamentosSimulados = []; 

    if (dados) {
        Object.keys(dados).forEach(key => {
            agendamentosSimulados.push({
                id: key, 
                ...dados[key]
            });
        });
    }

    // Atualiza tudo automaticamente quando o banco mudar
    gerarCalendario();
    const dataAlvo = document.getElementById('booking-date').value;
    atualizarHorariosLivres(); // Isso já chama o renderizarCompromissos internamente
});

// 2. Lógica de Horários
const gerarTodosHorarios = () => {
    let horarios = [];
    // Mudamos o limite para ser estritamente MENOR que 17
    for (let h = 8; h < 17; h++) {
        if (h === 12) continue; // Pula o horário de almoço das 12h00 às 12h59

        // Passa de 15 em 15 minutos dentro de cada hora
        for (let m = 0; m < 60; m += 15) {
            
            // Trava de segurança: Se chegar na hora 16 e o minuto passar de 30, ignora (para não criar 16:45)
            if (h === 16 && m > 30) {
                continue;
            }

            // Formata a hora e o minuto para ficarem sempre com 2 dígitos (ex: 08:00, 08:15)
            const horaFormatada = h.toString().padStart(2, '0');
            const minutoFormatado = m.toString().padStart(2, '0');
            
            horarios.push(`${horaFormatada}:${minutoFormatado}`);
        }
    }
    return horarios;
};

window.atualizarHorariosLivres = () => {
    const dataAlvo = document.getElementById('booking-date').value;
    const select = document.getElementById('free-slots');
    
    const ocupados = agendamentosSimulados
        .filter(a => a.data === dataAlvo)
        .map(a => a.horario);

    const todos = gerarTodosHorarios();
    const livres = todos.filter(h => !ocupados.includes(h));

    select.innerHTML = '<option value="">Selecione um horário</option>';
    livres.forEach(h => {
        select.innerHTML += `<option value="${h}">${h}</option>`;
    });

    renderizarCompromissos(dataAlvo);
};

// 3. Renderização da Interface (Cards)
const renderizarCompromissos = (data) => {
    const list = document.getElementById('events-list');
    const displayData = document.getElementById('data-dinamica');
    
    // Atualiza o texto da data ao lado do título
    if (data) {
        const dataFormatada = data.split('-').reverse().join('/');
        displayData.innerText = `- ${dataFormatada}`;
    } else {
        displayData.innerText = "";
    }

    const doDia = agendamentosSimulados
        .filter(a => a.data === data)
        .sort((a, b) => a.horario.localeCompare(b.horario));
    
    if (doDia.length === 0) {
        list.innerHTML = "<p>Nenhum compromisso marcado para este dia.</p>";
        return;
    }

    list.innerHTML = doDia.map((a, index) => `
        <div class="card-evento">
            <div class="info-evento">
                <strong>${a.horario}</strong>
                <span>${a.aluno}</span>
            </div>
            <div class="acoes-evento">
                <button class="btn-editar" onclick="editarEvento(${index}, '${data}')">✎</button>
                <button class="btn-excluir" onclick="excluirEvento(${index}, '${data}')">&times;</button>
            </div>
        </div>
    `).join('');
};

// 4. Salvar, Editar e Excluir (Firebase)
window.salvarAgendamento = () => {
    const nome = document.getElementById('student-name').value;
    const data = document.getElementById('booking-date').value;
    const horario = document.getElementById('free-slots').value;

    if (!nome || !data || !horario) {
        alert("Preencha todos os campos!");
        return;
    }

    database.ref('agendamentos').push({
        aluno: nome,
        data: data,
        horario: horario
    }).then(() => {
        document.getElementById('student-name').value = '';
    });
};

window.excluirEvento = (index, data) => {
    if (confirm("Deseja realmente excluir este agendamento?")) {
        const item = agendamentosSimulados
            .filter(a => a.data === data)
            .sort((a, b) => a.horario.localeCompare(b.horario))[index];

        database.ref('agendamentos/' + item.id).remove();
    }
};

window.editarEvento = (index, data) => {
    const item = agendamentosSimulados
        .filter(a => a.data === data)
        .sort((a, b) => a.horario.localeCompare(b.horario))[index];
        
    document.getElementById('student-name').value = item.aluno;
    document.getElementById('booking-date').value = item.data;
    
    // Remove do banco para substituir pelo novo ao clicar em salvar
    database.ref('agendamentos/' + item.id).remove();
    
    alert("Dados carregados! Altere e clique em 'Marcar Horário'.");
};

// 5. Calendário
let dataAtual = new Date();

function gerarCalendario() {
    const corpo = document.getElementById('calendar-body');
    const titulo = document.getElementById('mes-ano');
    corpo.innerHTML = '';

    const ano = dataAtual.getFullYear();
    const mes = dataAtual.getMonth();
    
    // 1. Pegamos a data que está escrita no campo de "Novo Agendamento"
    const dataSelecionadaNoInput = document.getElementById('booking-date').value;

    const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    titulo.innerText = `${nomesMeses[mes]} ${ano}`;

    const primeiroDia = new Date(ano, mes, 1).getDay();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();
    const espacos = primeiroDia === 0 || primeiroDia === 6 ? 0 : primeiroDia - 1;

    let linha = document.createElement("tr");

    for (let e = 0; e < espacos; e++) {
        linha.appendChild(document.createElement("td"));
    }

    for (let dia = 1; dia <= diasNoMes; dia++) {
        let dataObjeto = new Date(ano, mes, dia);
        let diaSemana = dataObjeto.getDay();

        if (diaSemana === 0 || diaSemana === 6) continue;

        let celula = document.createElement("td");
        const dataFormatada = `${ano}-${(mes + 1).toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
        
        // 2. Comparamos: se o dia do calendário for igual ao do input, aplicamos a classe
        if (dataFormatada === dataSelecionadaNoInput) {
            celula.classList.add('dia-selecionado');
        }

        celula.innerHTML = `<span class="dia-numero">${dia}</span>`;
        
        const eventos = agendamentosSimulados
            .filter(e => e.data === dataFormatada)
            .sort((a, b) => a.horario.localeCompare(b.horario));

        eventos.forEach(ev => {
            celula.innerHTML += `<div class="evento-mini">${ev.horario} ${ev.aluno}</div>`;
        });

        celula.onclick = () => {
            document.getElementById('booking-date').value = dataFormatada;
            gerarCalendario(); // Redesenha para mudar o destaque de lugar
            atualizarHorariosLivres();
        };
        
        linha.appendChild(celula);

        if (linha.children.length === 5) {
            corpo.appendChild(linha);
            linha = document.createElement("tr");
        }
    }
    if (linha.children.length > 0) corpo.appendChild(linha);
}

// Função para voltar ao mês atual ao clicar no título
window.voltarAoMesAtual = () => {
    dataAtual = new Date(); // Reseta para a data de hoje
    const hoje = dataAtual.toISOString().split('T')[0];
    document.getElementById('booking-date').value = hoje; // Atualiza o campo de data
    gerarCalendario(); // Renderiza o calendário novamente
    atualizarHorariosLivres(); // Atualiza a lista de compromissos para hoje
};

// 6. Pesquisa com controle do botão X
// 6. Pesquisa (Apenas de hoje para frente)
window.pesquisarAluno = () => {
    const input = document.getElementById('search-input');
    const btnLimpar = document.getElementById('clear-search');
    const termoBusca = input.value.toLowerCase();

    // Controle do Botão X: só aparece se houver texto
    if (btnLimpar) {
        btnLimpar.style.display = termoBusca.length > 0 ? 'block' : 'none';
    }

    if (termoBusca === "") {
        atualizarHorariosLivres(); 
        return;
    }

    // Pega a data de hoje no formato local "AAAA-MM-DD" para comparar direto
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    const dataAtualFormatada = `${ano}-${mes}-${dia}`; // Resultado: "2026-05-15"

    // Filtra: precisa bater o nome E a data ser maior ou igual a hoje
    const resultados = agendamentosSimulados.filter(a => 
        a.aluno.toLowerCase().includes(termoBusca) && a.data >= dataAtualFormatada
    );

    const list = document.getElementById('events-list');
    list.innerHTML = `<h3 style="margin-bottom: 15px; color: var(--cor-escura);">Resultados para "${input.value}":</h3>`;
    
    if (resultados.length === 0) {
        list.innerHTML += `<p style="text-align:center; color:#888;">Nenhum aluno encontrado para os próximos dias.</p>`;
        return;
    }

    // Ordena os resultados por data para ficar organizado
    resultados.sort((a, b) => a.data.localeCompare(b.data) || a.horario.localeCompare(b.horario));

    list.innerHTML += resultados.map(a => {
        return `
        <div class="card-evento" style="cursor:pointer" onclick="irParaData('${a.data}')">
            <div class="info-evento">
                <strong>${a.horario}</strong>
                <span>${a.aluno}</span>
                <small style="color: var(--cor-mais-escura); font-weight: bold;">Data: ${a.data.split('-').reverse().join('/')}</small>
            </div>
            <div class="acoes-evento">
                <button class="btn-editar" onclick="event.stopPropagation(); editarEventoDoResultado('${a.id}')">✎</button>
                <button class="btn-excluir" onclick="event.stopPropagation(); excluirEventoDoResultado('${a.id}')">&times;</button>
            </div>
        </div>`;
    }).join('');
};

// Mantém a função de limpar o campo ativa
window.limparPesquisa = () => {
    const input = document.getElementById('search-input');
    input.value = '';
    window.pesquisarAluno(); 
    input.focus(); 
};

window.irParaData = (dataString) => {
    // 1. Converte a string '2024-12-15' em um objeto de data
    const partes = dataString.split('-');
    const novaData = new Date(partes[0], partes[1] - 1, partes[2]);

    // 2. Atualiza a variável global do calendário
    dataAtual = novaData;

    // 3. Atualiza o campo de data e gera a interface
    document.getElementById('booking-date').value = dataString;
    gerarCalendario();
    atualizarHorariosLivres();

    // 4. Limpa a busca para mostrar os compromissos do dia selecionado
    document.getElementById('search-input').value = "";
};

window.excluirEventoDoResultado = (index) => {
    const item = agendamentosSimulados[index];
    if (confirm("Excluir agendamento?")) {
        database.ref('agendamentos/' + item.id).remove().then(() => pesquisarAluno());
    }
};

window.editarEventoDoResultado = (index) => {
    const item = agendamentosSimulados[index];
    document.getElementById('student-name').value = item.aluno;
    document.getElementById('booking-date').value = item.data;
    database.ref('agendamentos/' + item.id).remove().then(() => {
        alert("Altere e salve.");
        document.getElementById('search-input').value = "";
    });
};

// Funções de Navegação do Calendário
window.mudarMes = (direcao) => {
    dataAtual.setMonth(dataAtual.getMonth() + direcao);
    gerarCalendario();
};

// 7. Inicialização Correta
document.addEventListener('DOMContentLoaded', () => {
    // 1. Define a data de hoje no campo de agendamento
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('booking-date').value = hoje;
    
    // 2. O Firebase já vai chamar o gerarCalendario() automaticamente 
    // assim que terminar de carregar os dados (pelo database.ref().on)
});