/** @jsx createElement */
import _ from 'lodash'
import { createElement } from 'elliptical'
import { Command } from 'lacona-phrases'
import { showNotification } from 'lacona-api'
import { execFile } from 'child_process'
import { onActivate, onFetch } from 'lacona-source-helpers'
import { join } from 'path'

const AUDIODEVICEPATH = join(__dirname, '../bin/audiodevice')

function audiodevice (args) {
  return new Promise((resolve, reject) => {
    execFile(AUDIODEVICEPATH, args, (err, stdout, stderr) => {
      if (stderr) {
        console.error(stderr)
      }
      err ? reject(err) : resolve(stdout)
    })
  })
}

async function fetchAudioPorts () {
  try {
    const output = await audiodevice([])
    const ports = _.chain(output)
      .split('\n')
      .filter()
      .map(line => _.split(line, ':')[0])
      .value()

    return ports
  } catch (e) {
    console.error(e)
    await showNotification({title: 'Audio Devices', subtitle: `Error fetching audio ports`})
  }
}

const AudioPortSource = onActivate(fetchAudioPorts, [])

const AudioPort = {
  describe ({observe}) {
    const ports = observe(<AudioPortSource />)
    const items = _.map(ports, port => ({
      text: _.capitalize(port),
      value: port
    }))

    return (
      <placeholder argument='audio port' suppressEmpty={false}>
        <list items={items} />
      </placeholder>
    )
  }
}

async function fetchAudioDevices ({port}) {
  try {
    const output = await audiodevice([port, 'list'])
    const devices = _.chain(output)
      .split('\n')
      .filter()
      .value()

    return devices
  } catch (e) {
    console.error(e)
    await showNotification({title: 'Audio Devices', subtitle: `Error fetching audio devices`})
  }
}

const AudioDeviceSource = onFetch(fetchAudioDevices, [])

function describeAudioDevice (observe, input, {result}) {
  let items = []
  if (result.port) {
    const audioDevices = observe(<AudioDeviceSource port={result.port} />)
    items = _.map(audioDevices, device => ({
      text: device,
      value: device
    }))
  }

  return (
    <placeholder argument='audio device' suppressEmpty={false}>
      <list items={items} />
    </placeholder>
  )
}

const AudioDevice = {
  describe ({observe}) {
    return <dynamic describe={describeAudioDevice.bind(this, observe)} consumeAll />
  }
}

export const SwitchAudioDeviceCommand = {
  extends: [Command],

  async execute (result) {
    await audiodevice([result.port, result.device])
    await showNotification({title: 'Audio Devices', subtitle: `Set ${_.capitalize(result.port)} audio device to ${result.device}.`})
  },

  describe () {
    return (
      <sequence>
        <literal text='set ' />
        <AudioPort id='port' />
        <literal text=' to ' />
        <AudioDevice id='device' />
      </sequence>
    )
  }
}

export const extensions = [SwitchAudioDeviceCommand]
