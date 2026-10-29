# Samvriddhi Fund Analyser: self-updating version

A web page that holds every active Indian mutual fund scheme and its NAV history. Every night a free GitHub job downloads the new NAVs and newly launched funds from AMFI India, rebuilds the page and publishes it at a fixed web address. No login, no database, no cost.

## One-time setup (about 15 minutes)

1. **GitHub account.** Sign up free at github.com.
2. **New repository.** Click New repository. Name it `samvriddhi-fund-analyser`. Choose **Public** (free web hosting needs a public repository; it only holds public AMFI data and this app). Create it.
3. **Upload the files.** On the new repository page click "uploading an existing file". Open the unzipped folder, select everything inside it (the `data`, `parts` and `scripts` folders, this README and `workflow-update.yml`) and drag it into the page. Wait for the upload to finish, then click Commit changes.
4. **Add the daily job.** In the repository click Add file, then Create new file. In the name box type `.github/workflows/update.yml` (typing the slashes makes the folders). Open `workflow-update.yml` from the unzipped folder in any text editor, copy everything, paste it into the big box, and click Commit changes.
5. **Turn on web hosting.** Settings, then Pages. Under "Build and deployment" set Source to **GitHub Actions**.
6. **Run it the first time.** Click the Actions tab, choose "Update NAVs and publish site", click Run workflow. It takes about 5 to 10 minutes. A green tick means it worked.
7. **Open the link.** It is `https://YOUR-GITHUB-NAME.github.io/samvriddhi-fund-analyser/` (Settings, Pages also shows it). Give that link to Sunil. It updates by itself every night from then on.

## How to check it is working
- The line at the bottom of the left menu shows "NAVs to <date>". After the first run it should be the latest NAV date AMFI has published.
- Actions tab, open a run, open "Add new NAVs and new funds from AMFI". You should see lines such as `history ... ok` and `added ... NAV points`.
- If that step says `could not be fetched` or `ERROR`, copy those lines and send them to your developer (or back to Claude). The first run is the real test of the AMFI download.

## Good to know
- NAVs are published once a day by AMFI, usually late evening India time. The page shows the previous day's NAVs after midnight, not live prices.
- If a night is missed, the next run fills the gap automatically.
- GitHub pauses scheduled jobs on a repository with no activity for 60 days. If that happens, open the Actions tab and press Run workflow again.
- The first visit downloads about 40 MB (the whole fund database); after that the browser keeps it.
- Fund size (AUM), minimum investment and launch date come from the starter data and are not refreshed. New funds show only their name, fund house, category and NAVs.
- Closed and matured funds are not included.
- Check AMFI's terms of use for business use of the data.
- The saved data lives in the repository's Releases section ("Saved NAV data"). Do not delete it. If you do, the next run starts again from the starter data and downloads the gap from AMFI.
