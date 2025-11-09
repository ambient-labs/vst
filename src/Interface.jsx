import React, { useState } from 'react';
import { XCircleIcon, XMarkIcon } from '@heroicons/react/20/solid'

import Knob from './Knob.jsx';

import manifest from '../public/manifest.json';



// The interface of our plugin, exported here as a React.js function
// component.
//
// We use the `props.requestParamValueUpdate` callback provided by the parent
// component to propagate new parameter values to the host.
export default function Interface(props) {
  const colorProps = {
    meterColor: '#EC4899',
    knobColor: '#64748B',
    thumbColor: '#F8FAFC',
  };

  let params = manifest.parameters.map(({paramId, name, min, max, defaultValue}) => {
    let currentValue = props[paramId] || 0;

    return {
      paramId,
      name,
      value: currentValue,
      readout: `${Math.round(currentValue * 100)}%`,
      setValue: (v) => props.requestParamValueUpdate(paramId, v),
    };
  });

  return (
    <div className="w-full h-screen min-w-[492px] min-h-[238px] bg-slate-800 bg-mesh p-8">
      <div className="flex flex-col h-4/5">
        <div className="flex flex-1">
          {params.map(({name, value, readout, setValue}) => (
            <div key={name} className="flex flex-col flex-1 justify-center items-center">
              <Knob className="h-20 w-20 m-4" value={value} onChange={setValue} {...colorProps} />
              <div className="flex-initial mt-2">
                <div className="text-sm text-slate-50 text-center font-light">{name}</div>
                <div className="text-sm text-pink-500 text-center font-light">{readout}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
