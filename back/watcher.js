//Watcher that works properly if the filename is given as parameter after watcher.js
//Import of required modules in this page
import { spawn } from 'node:child_process'
import { watch } from 'node:fs/promises'

//Extracts variables from the input command
const [node, _, file] = process.argv

/**
 * Subexecute with node the javascript file given in parameter
 * @returns {import('node:child_process').ChildProcessWithoutNullStreams}
 */
function subExecute() {
	const subProcess = spawn(node, [file])
	subProcess.stdout.pipe(process.stdout)
	subProcess.stderr.pipe(process.stderr)
	subProcess.on('close', (code) => {
		if (code !== null) {
			process.exit(code)
		}
	})
	return subProcess
}

/*Calls a subexecution, then watch for javascript files modifications and calls a new execution in case the first one still runs.
If the subexecution ends without any javascript files being modified in the interval, the watcher ends.
*/
console.log('Démarrage du Watcher...')
let childExecution = subExecute()
const watcher = watch('./', { recursive: true })
for await (const event of watcher) {
	if (event.filename.endsWith('.js') && !event.filename.startsWith('node_modules')) {
		console.log('Redémarrage du sous-process...')
		childExecution.kill('SIGKILL')
		childExecution = subExecute()
	}
}