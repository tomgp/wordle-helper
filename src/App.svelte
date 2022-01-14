<script>
	import manager from './constraintManager.js';
	import Guess from './Guess.svelte';
	import GuessRecord from './GuessRecord.svelte';
	import longList from './longWordList.js';

	let m = manager(longList);

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
	<p><a href="#about">About this page</a></p>
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
			<div class="possibility-list">
			{#each possibilities as possibility}
			<a href="#top" on:click={()=>tryWord(possibility.word)} class="suggestion"> {possibility.word}<sub>{possibility.value}</sub> </a>
			{/each}
			</div>
		</div>
		<div>
			<h2>Ruled out but not useless ({untried.length}) <a href="#ruled-out"><sup>?</sup></a></h2>
			<div class="possibility-list">
			{#each untried as possibility}
			<a href="#top" on:click={()=>tryWord(possibility.word)} class="suggestion"> {possibility.word}<sub>{possibility.value}</sub> </a>
			{/each}
			</div>
		</div>
	</section>
	<section id="about">
		<h2 class="about">About this</h2>
		<p><a class="up" href="#top">Back to the top &uarr;</a></p>
		<p>I've enjoyed playing <a href="https://www.powerlanguage.co.uk/wordle/">Wordle</a>.  I love the way you only get a single word a day, it feels respectful of my time and encourages a thoughful approach to solving each puzzle. Also, it fosters a really nice community vibe as people try to discover the same word as one another each day. It's telling that all the inevitable knockoffs seem to ditch the one puzzle a day rule, the best most interesting part of the whole thing.</p>
		<p>The puzzle itself is moderartely interesting. There's a gameshow called <a href="https://www.itv.com/hub/lingo/10a0540">Lingo</a> on ITV which uses the same puzzle, with 4 letters instead of 5, and adds time pressure and direct competition which changes the dynamic and feel of the puzzle in interesting ways.</p>
		<p>Anyway, I got interested in what the best strategy for solving Wordle puzzles might be e.g. is it better to get as many letters as possible even if you're choosing words you know aren't possible, or is it better to take the <a href="https://i.etsystatic.com/9295891/r/il/12309a/1268275533/il_fullxfull.1268275533_hd9h.jpg">Mastermind</a>-like gradual deduction approach. And what does the possibility space look like? How fast do your options narrow? etc. I guess I'm more interested in understanding the puzzle than solving specific instances of it (c.f. sudoku). Hence this page.</p>
		<h3>What are those little<sub>subscript</sub> numbers?</h3>
		<p>The little subscript number next to each possible word is a value score assigned to that word based on how frequently it's letters appear in other words, the idea being that all else being equal choosing the letters that appear frequently is most likely to gain you more information.</p>
		<h3>Process</h3>
		<p>Initially I made a Javascript module that progressivley added constraints to filter a list of words and just played around with it on the command line. Once I was reasnoably satisfied that it worked I built a rudimentary UI for it in <a href="https://www.svelte.dev">Svelte</a>. The constraint solving bit and the UI don't fit together too nicely I put this down to being a Svelte novice.</p>
		<p>I think my approach is OK, though I'm sure someone smarter could do better, there are a few sources of information the system doesn't take into account (e.g.letter position frequency) when ranking the value of a given guess.</p>
		<p><a href="https://github.com/tomgp/wordle-helper">Please feel free to suggest improvements to/ laugh at the code on GitHub</a></p>
		<h3 id="ruled-out">What's the "Not useless" column about?</h3>
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
		min-height: 230px;
	}
	@media(max-width: 700px) {
		.suggestions, 
		.input{
			grid-template-columns: 1fr;
		}
	}

	.suggestions h2{
		height: 3rem;
		margin-bottom: 2rem;
	}
	.possibility-list{
		max-height: 50vh;
		overflow-y: scroll;
		overflow-x: hidden;
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