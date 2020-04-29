const videoID = '394094043';
const eventKey = '2019isde4';
const fileName = 'day1.mp4';
const TBA_KEY = '';
const TWITCH_KEY = 'k7l2k845upq0u7a96a3a10qoaqc5ka';
const muteAudio = false;
const offset = 0;

///////////////////////////////////////////////////////////////////////////////////
const exec = require('child_process').exec;
const fetch = require('node-fetch');
const matchLevels = {
  qm: 'Qualification',
  ef: 'Octo-finals',
  qf: 'Quarters',
  sf: 'Semis',
  f: 'Finals'
};

(async () => {
  const video = (await httpGet('https://api.twitch.tv/helix/videos?id=' + videoID)).data[0];
  const duration = formatDuration(video.duration) * 1000;
  const unixStart = new Date(video.created_at).getTime();
  const unixEnd = unixStart + duration;

  const event = await httpGet('https://www.thebluealliance.com/api/v3/event/' + eventKey);
  const eventName = `${event.name} ${event.year}`;
  const matches = await httpGet('https://www.thebluealliance.com/api/v3/event/' + eventKey + '/matches');

  if (!Array.isArray(matches)) {
    error(matches.Error);
  }

  matches.forEach((match) => {
    if (match.match_start_time) {
      const startTime = new Date(match.match_start_time).getTime() + offset * 1000;
      const endTime = match.post_result_time + 15000;
      const key = match.key.replace(eventKey + '_', '').toUpperCase();
      const compLevel = match.comp_level;
      const videoName = `${key} ${eventName}`;

      let matchName = `${matchLevels[compLevel]} ${match.match_number}`;
      if (compLevel !== 'qm' && compLevel !== 'f') {
        matchName = `${matchLevels[compLevel]} ${match.set_number} Match ${match.match_number}`;
      }

      if (unixEnd > endTime && unixStart < startTime) {
        let start = new Date(null);
        let end = new Date(null);
        start.setMilliseconds(startTime - unixStart);
        end.setMilliseconds(endTime - unixStart);

        let ffmpegPath = '';
        const os = process.platform;
        if (os === 'darwin') {
          ffmpegPath = './ffmpeg/ffmpeg'; // macOS
        } else if (os === 'win32') {
          ffmpegPath = './ffmpeg/ffmpeg.exe'; // Windows
        } else {
          error('Unknown OS');
        }

        console.log(`✂️ Cutting ${matchName}`);
        const command = `${ffmpegPath} -ss ${start.toISOString().substr(11, 8)} -to ${end
          .toISOString()
          .substr(11, 8)} -i ${fileName} -y -c copy ${muteAudio ? '-an' : ''} "${videoName}.mp4"`;
        execute(command, (error, result) => {
          if (error) console.log(error);
          if (result) console.log(result);
        });

        // console.log(`\n\n\n${matchName} - ${eventName}
        // Red (Teams ${match.alliances.red.team_keys.join(', ').replace(/frc/g, '')}) - ${match.alliances.red.score}
        // Blue (Teams ${match.alliances.blue.team_keys.join(', ').replace(/frc/g, '')}) - ${match.alliances.blue.score}
        // https://frc-events.firstinspires.org/${event.year}/${event.first_event_code}/${
        //   compLevel === 'qm' ? 'qualifications' : 'playoffs'
        // }`);
      }
    }
  });

  function execute(command, callback) {
    exec(command, (error, stdout) => {
      callback(error, stdout);
    });
  }

  function error(error) {
    console.log('\033[31mError: ' + error);
    process.exit(0);
  }

  function httpGet(url) {
    return fetch(url, {
      headers: {
        'Client-ID': url.includes('twitch.tv') && TWITCH_KEY,
        'X-TBA-Auth-Key': url.includes('thebluealliance') && TBA_KEY
      }
    }).then((res) => res.json());
  }

  function formatDuration(duration) {
    let a = duration.match(/\d+/g);
    if (duration.includes('H') && duration.includes('M')) {
      a = [a[0], a[1], 0];
    } else if (duration.includes('H') && duration.includes('S') && a.length === 2) {
      a = [a[0], 0, a[1]];
    } else if (duration.includes('H') && a.length === 1) {
      a = [a[0], 0, 0];
    } else if (duration.includes('M') && a.length === 1) {
      a = [a[0], 0];
    }

    if (a.length === 3) {
      return parseInt(a[0]) * 3600 + parseInt(a[1]) * 60 + parseInt(a[2]);
    } else if (a.length === 2) {
      return parseInt(a[0]) * 60 + parseInt(a[1]);
    } else if (a.length === 1) {
      return parseInt(a[0]);
    }
    return 0;
  }
})();
