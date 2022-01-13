<script>
	import manager from './constraintManager.js';
	import Guess from './Guess.svelte';
	import GuessRecord from './GuessRecord.svelte';
	const m = manager();
	let possibilities, untried;
	let guessCount = 0;
	let currentGuess = ''
	let guessHistory = [];
	$:{
		guessCount = guessCount;
		possibilities = m.rankedList();
		untried = m.disjunct();
	}

	function submitGuess(e){
		console.log('submit', e.detail);
		guessHistory.push(e.detail);
		guessHistory=guessHistory;
		m.setWordleResult(e.detail);
		guessCount++;
		currentGuess = '';
	}

	function tryWord(w){
		//console.log('w',w)
		currentGuess = w;
	}

	</script>
	<article>
	<h1>Wordle helper v1</h1>
	<section>
		<div>
			<p>Enter a word: <input type="text" bind:value={currentGuess} maxlength={5} /></p>
			<p>Note the result: <Guess word={currentGuess} on:submit={submitGuess}/></p>
		</div>
		<div class="history">
			<h2>History</h2>
			{#each guessHistory as guess}
			<GuessRecord guess={guess} />
			{/each}
		</div>
	</section>
	<section class="suggestions">
		<div>
			<h2>Try a possibility or...</h2>
			{#each possibilities as possibility}
			<button on:click={()=>tryWord(possibility.word)} class="suggestion"> {possibility.word}<sub>{possibility.value}</sub> </button>
			{/each}
		</div>
		<div>
			<h2>... something not possible but with untried letters</h2>
			{#each untried as possibility}
			<button on:click={()=>tryWord(possibility.word)} class="suggestion"> {possibility.word}<sub>{possibility.value}</sub> </button>
			{/each}
		</div>
	</section>
	</article>
	<footer>
    <p><a href="https://www.toffeemilkshake.co.uk">Tom Pearson</a> Jan 2022</p></footer>
<style>
	.suggestions{
		display: grid;
		grid-template-columns: 1fr 1fr;
	}
	li{
		list-style: none;
	}
	sub{
		font-size: xx-small;
		color: lightgrey;
	}
	.suggestion{
		background: none!important;
		border: none;
		margin-right: 5px;
		font-family: sans-serif;
	}
	.suggestion:hover{
		color: red;
		cursor: pointer;
		border-bottom: 1px solid red;
	}
</style>