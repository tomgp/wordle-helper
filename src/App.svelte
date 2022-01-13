<script>
	import manager from './constraintManager.js';
	import Guess from './Guess.svelte';
	import GuessRecord from './GuessRecord.svelte';
	// import longList from './longWordList.js';

	let m = manager();

	let possibilities, untried;
	let guessCount = 0;
	let currentGuess = ''
	let guessHistory = [];
	$:{
		guessCount = guessCount; // use this to trigger the reactive block (is there a better way?)
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
		currentGuess = w;
	}

	</script>

	<article>
	<h1 id="top">Wordle <span class="strike">helper</span> ruiner v1</h1>
	<section class="input">
		<div>
			<p>
				Guess: 
				<input type="text" bind:value={currentGuess} maxlength={5} />
			</p>
			<div>
				<Guess word={currentGuess} on:submit={submitGuess}/>
			</div>
		</div>
		<div class="history">
			{#each guessHistory as guess}
			<GuessRecord guess={guess} />
			{/each}
		</div>
	</section>
	<section class="suggestions">
		<div>
			<h2>Suggestions ({possibilities.length})</h2>
			{#each possibilities as possibility}
			<a href="#top" on:click={()=>tryWord(possibility.word)} class="suggestion"> {possibility.word}<sub>{possibility.value}</sub> </a>
			{/each}
		</div>
		<div>
			<h2>Ruled out but not useless ({untried.length}) <a href="#ruled-out"><sup>?</sup></a></h2>
			{#each untried as possibility}
			<a href="#top" on:click={()=>tryWord(possibility.word)} class="suggestion"> {possibility.word}<sub>{possibility.value}</sub> </a>
			{/each}
		</div>
	</section>
	<section id="ruled-out">
		<h3>Not useless?</h3>
		<p>Sometimes it's useful to play a word that's technically been ruled out in order to find out some more letters, that's what the words in this second column are for. <a class="up" href="#top">Back to the top &uarr;</a></p>
	</section>
	</article>
	<footer>
    <p><a href="https://www.toffeemilkshake.co.uk">Tom Pearson</a> Jan 2022</p></footer>
<style>
	section{
		border-bottom: 1px solid black;
	}

	.suggestions, 
	.input{
		display: grid;
		grid-template-columns: 1fr 1fr;
		column-gap:1rem;
	}

	h2{
		height:3rem;
	}

	h2 sub{
		color:red;
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
	.strike{
		text-decoration: line-through;
	}
</style>